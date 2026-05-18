---
summary: "Soporte nativo de iMessage a través de imsg (JSON-RPC sobre stdio), con acciones de API privada para respuestas, tapbacks, efectos, archivos adjuntos y gestión de grupos. Preferido para nuevas configuraciones de OpenClaw iMessage cuando los requisitos del host se ajustan."
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
Para los despliegues de iMessage de OpenClaw, use `imsg` en un host de macOS de Messages que haya iniciado sesión. Si su Gateway se ejecuta en Linux o Windows, apunte `channels.imessage.cliPath` a un contenedor SSH que ejecute `imsg` en el Mac.

**La recuperación tras el tiempo de inactividad del Gateway es opcional.** Cuando está habilitada (`channels.imessage.catchup.enabled: true`), el gateway reproduce los mensajes entrantes que llegaron a `chat.db` mientras estaba desconectado (fallos, reinicios, suspensión del Mac) en el próximo inicio. Deshabilitado de forma predeterminada; consulte [Catching up after gateway downtime](#catching-up-after-gateway-downtime). Cierra [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649).

</Note>

<Warning>
  Se eliminó la compatibilidad con BlueBubbles. Migre las configuraciones de `channels.bluebubbles` a `channels.imessage`; OpenClaw admite iMessage solo a través de `imsg`. Comience con [BlueBubbles removal and the imsg iMessage path](/es/announcements/bluebubbles-imessage) para el anuncio breve, o [Coming from BlueBubbles](/es/channels/imessage-from-bluebubbles) para la tabla completa de
  migración.
</Warning>

Estado: integración nativa de CLI externa. Gateway inicia `imsg rpc` y se comunica a través de JSON-RPC en stdio (sin demonio/puerto separado). Las acciones avanzadas requieren `imsg launch` y un sondeo exitoso de la API privada.

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

  <Tab title="Remote Mac over SSH">
    OpenClaw solo requiere un `cliPath` compatible con stdio, por lo que puedes apuntar `cliPath` a un script de envoltura que haga SSH a un Mac remoto y ejecute `imsg`.

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

    Si `remoteHost` no está configurado, OpenClaw intenta detectarlo automáticamente analizando el script de envoltura SSH.
    `remoteHost` debe ser `host` o `user@host` (sin espacios ni opciones de SSH).
    OpenClaw utiliza verificación estricta de clave de host para SCP, por lo que la clave de host del relé ya debe existir en `~/.ssh/known_hosts`.
    Las rutas de los adjuntos se validan contra las raíces permitidas (`attachmentRoots` / `remoteAttachmentRoots`).

  </Tab>
</Tabs>

## Requisitos y permisos (macOS)

- Messages debe tener la sesión iniciada en el Mac que ejecuta `imsg`.
- Se requiere Acceso total al disco para el contexto del proceso que ejecuta OpenClaw/`imsg` (acceso a la base de datos de Messages).
- Se requiere permiso de automatización para enviar mensajes a través de Messages.app.
- Para acciones avanzadas (reaccionar / editar / deshacer envío / respuesta en hilo / efectos / operaciones de grupo), la Protección de Integridad del Sistema debe estar deshabilitada; consulte [Enabling the imsg private API](#enabling-the-imsg-private-api) a continuación. El envío y recepción básicos de texto y medios funcionan sin ella.

<Tip>
Los permisos se otorgan por contexto de proceso. Si la puerta de enlace se ejecuta sin interfaz gráfica (LaunchAgent/SSH), ejecute un comando interactivo único en ese mismo contexto para activar los indicadores:

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## Habilitar la API privada de imsg

`imsg` funciona en dos modos operativos:

- **Modo básico** (predeterminado, no se requieren cambios en SIP): texto y medios salientes a través de `send`, supervisión/historial entrante, lista de chat. Esto es lo que obtiene de forma inmediata con una `brew install steipete/tap/imsg` nueva más los permisos estándar de macOS mencionados anteriormente.
- **Modo de API privada**: `imsg` inyecta una dylib auxiliar en `Messages.app` para llamar a funciones internas de `IMCore`. Esto es lo que desbloquea `react`, `edit`, `unsend`, `reply` (en hilos), `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, además de indicadores de escritura y confirmaciones de lectura.

Para alcanzar la superficie de acciones avanzada que documenta esta página del canal, necesitas el modo de API privada. El README de `imsg` es explícito sobre el requisito:

> Las funciones avanzadas como `read`, `typing`, `launch`, envío enriquecido respaldado por puente, mutación de mensajes y gestión de chats son opcionales. Requieren que SIP esté deshabilitado y que se inyecte una dylib auxiliar en `Messages.app`. `imsg launch` se niega a inyectar cuando SIP está habilitado.

La técnica de inyección de ayuda utiliza la propia dylib de `imsg` para alcanzar las API privadas de Messages. No hay servidor de terceros ni tiempo de ejecución de BlueBubbles en la ruta iMessage de OpenClaw.

<Warning>
**Deshabilitar SIP es una compensación de seguridad real.** SIP es una de las protecciones centrales de macOS contra la ejecución de código del sistema modificado; desactivarlo en todo el sistema abre una superficie de ataque adicional y efectos secundarios. En particular, **deshabilitar SIP en Macs con Apple Silicon también deshabilita la capacidad de instalar y ejecutar apps de iOS en tu Mac**.

Trata esto como una elección operacional deliberada, no como un valor predeterminado. Si tu modelo de amenazas no tolera que SIP esté desactivado, iMessage incluido se limita al modo básico — solo envío y recepción de texto y medios, sin reacciones / editar / no enviar / efectos / operaciones de grupo.

</Warning>

### Configuración

1. **Instale (o actualice) `imsg`** en la Mac que ejecuta Messages.app:

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   La salida de `imsg status --json` informa `bridge_version`, `rpc_methods` y `selectors` por método, para que pueda ver qué admite la compilación actual antes de comenzar.

2. **Deshabilita la Protección de Integridad del Sistema.** Esto es específico de la versión de macOS porque el requisito subyacente de Apple depende del sistema operativo y el hardware:
   - **macOS 10.13–10.15 (Sierra–Catalina):** deshabilite la validación de bibliotecas a través de la Terminal, reinicie en modo de recuperación, ejecute `csrutil disable`, reinicie.
   - **macOS 11+ (Big Sur y posteriores), Intel:** modo de recuperación (o recuperación por internet), `csrutil disable`, reinicie.
   - **macOS 11+, Apple Silicon:** secuencia de inicio con el botón de encendido para entrar en recuperación; en versiones recientes de macOS mantenga presionada la tecla **Left Shift** cuando haga clic en Continuar, luego `csrutil disable`. Las configuraciones de máquinas virtuales siguen un flujo separado: tome primero una instantánea de la VM.
   - **macOS 26 / Tahoe:** las políticas de validación de bibliotecas y las comprobaciones de derechos de acceso privado (private-entitlement) de `imagent` se han estrechado aún más; es posible que `imsg` necesite una compilación actualizada para mantenerse al día. Si la inyección de `imsg launch` o `selectors` específicos comienzan a devolver false después de una actualización mayor de macOS, consulte las notas de la versión de `imsg` antes de asumir que el paso de SIP se realizó correctamente.

   Siga el flujo del modo de recuperación de Apple para su Mac para desactivar SIP antes de ejecutar `imsg launch`.

3. **Inyecta el asistente.** Con SIP deshabilitado y Messages.app iniciado:

   ```bash
   imsg launch
   ```

   `imsg launch` se niega a inyectarse cuando SIP aún está habilitado, por lo que esto también sirve como confirmación de que se realizó el paso 2.

4. **Verifica el puente desde OpenClaw:**

   ```bash
   openclaw channels status --probe
   ```

   La entrada de iMessage debe informar `works`, y `imsg status --json | jq '.selectors'` debe mostrar `retractMessagePart: true` más los selectores de edición / escritura / lectura que exponga su compilación de macOS. El filtrado por método del complemento OpenClaw en `actions.ts` solo anuncia acciones cuyo selector subyacente sea `true`, por lo que la superficie de acción que ve en la lista de herramientas del agente refleja lo que el puente realmente puede hacer en este host.

Si `openclaw channels status --probe` informa el canal como `works` pero acciones específicas lanzan "iMessage `<action>` requiere el puente de la API privada imsg" en el momento del envío, ejecute `imsg launch` nuevamente; el asistente puede desactivarse (reinicio de Messages.app, actualización del sistema operativo, etc.) y el estado `available: true` en caché seguirá anunciando acciones hasta que la próxima sondeo lo actualice.

### Cuando no puedes deshabilitar SIP

Si tener SIP deshabilitado no es aceptable para tu modelo de amenazas:

- `imsg` recurre al modo básico — texto + medios + solo recepción.
- El complemento OpenClaw todavía anuncia el envío de texto/medios y el monitoreo de entrada; simplemente oculta `react`, `edit`, `unsend`, `reply`, `sendWithEffect` y las operaciones de grupo de la superficie de acción (según la puerta de capacidad por método).
- Puede ejecutar un Mac separado que no sea de Apple Silicon (o un Mac dedicado para bots) con SIP deshabilitado para la carga de trabajo de iMessage, mientras mantiene SIP habilitado en sus dispositivos principales. Consulte [Dedicated bot macOS user (separate iMessage identity)](#deployment-patterns) a continuación.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.imessage.dmPolicy` controla los mensajes directos:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    Campo de lista de permitidos: `channels.imessage.allowFrom`.

    Las entradas de la lista de permitidos deben identificar a los remitentes: identificadores o grupos de acceso de remitentes estáticos (`accessGroup:<name>`). Use `channels.imessage.groupAllowFrom` para objetivos de chat como `chat_id:*`, `chat_guid:*` o `chat_identifier:*`; use `channels.imessage.groups` para claves de registro numéricas `chat_id`.

  </Tab>

  <Tab title="Política de grupo + menciones">
    `channels.imessage.groupPolicy` controla el manejo de grupos:

    - `allowlist` (predeterminado cuando se configura)
    - `open`
    - `disabled`

    Lista de permitidos de remitentes de grupo: `channels.imessage.groupAllowFrom`.

    Las entradas `groupAllowFrom` también pueden hacer referencia a grupos de acceso de remitentes estáticos (`accessGroup:<name>`).

    Respaldo en tiempo de ejecución: si `groupAllowFrom` no está definido, las comprobaciones de remitente de grupo de iMessage usan `allowFrom`; defina `groupAllowFrom` cuando la admisión de MD y grupos deba diferir.
    Nota de tiempo de ejecución: si `channels.imessage` falta por completo, el tiempo de ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está definido).

    <Warning>
    El enrutamiento de grupos tiene **dos** puertas de lista de permitidos ejecutándose una tras otra, y ambas deben aprobar:

    1. **Lista de permitidos de remitente / destino de chat** (`channels.imessage.groupAllowFrom`) — identificador, `chat_guid`, `chat_identifier` o `chat_id`.
    2. **Registro de grupo** (`channels.imessage.groups`) — con `groupPolicy: "allowlist"`, esta puerta requiere una entrada de comodín `groups: { "*": { ... } }` (establece `allowAll = true`) o una entrada explícita por `chat_id` bajo `groups`.

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

    Si esas líneas `warn` aparecen en el registro de la puerta de enlace, la puerta 2 está descartando — añada el bloque `groups`.
    </Warning>

    Filtrado de menciones para grupos:

    - iMessage no tiene metadatos nativos de mención
    - la detección de menciones usa patrones de expresiones regulares (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - sin patrones configurados, no se puede aplicar el filtrado de menciones

    Los comandos de control de remitentes autorizados pueden omitir el filtrado de menciones en grupos.

    `systemPrompt` por grupo:

    Cada entrada bajo `channels.imessage.groups.*` acepta una cadena `systemPrompt` opcional. El valor se inyecta en el mensaje del sistema del agente en cada turno que maneja un mensaje en ese grupo. La resolución refleja la resolución de mensaje por grupo utilizada por `channels.whatsapp.groups`:

    1. **Mensaje del sistema específico del grupo** (`groups["<chat_id>"].systemPrompt`): se usa cuando la entrada específica del grupo existe en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), el comodín se suprime y no se aplica ningún mensaje del sistema a ese grupo.
    2. **Mensaje del sistema de comodín de grupo** (`groups["*"].systemPrompt`): se usa cuando la entrada específica del grupo falta por completo del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

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

    Los mensajes por grupo solo se aplican a los mensajes de grupo — los mensajes directos en este canal no se ven afectados.

  </Tab>

  <Tab title="Sesiones y respuestas deterministas">
    - Los MD utilizan enrutamiento directo; los grupos utilizan enrutamiento de grupo.
    - Con el `session.dmScope=main` predeterminado, los MD de iMessage se colapsan en la sesión principal del agente.
    - Las sesiones de grupo están aisladas (`agent:<agentId>:imessage:group:<chat_id>`).
    - Las respuestas se enrutan de vuelta a iMessage utilizando los metadatos del canal/objetivo de origen.

    Comportamiento de hilo tipo grupo:

    Algunos hilos de iMessage de varios participantes pueden llegar con `is_group=false`.
    Si ese `chat_id` está configurado explícitamente bajo `channels.imessage.groups`, OpenClaw lo trata como tráfico de grupo (filtrado de grupo + aislamiento de sesión de grupo).

  </Tab>
</Tabs>

## Vínculos de conversación ACP

Los chats heredados de iMessage también pueden vincularse a sesiones ACP.

Flujo rápido del operador:

- Ejecute `/acp spawn codex --bind here` dentro del MD o del chat de grupo permitido.
- Los mensajes futuros en esa misma conversación de iMessage se enrutan a la sesión ACP generada.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina el vínculo.

Los vínculos persistentes configurados son compatibles a través de entradas `bindings[]` de nivel superior con `type: "acp"` y `match.channel: "imessage"`.

`match.peer.id` puede usar:

- identificador de MD normalizado, como `+15555550123` o `user@example.com`
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

Consulte [ACP Agents](/es/tools/acp-agents) para conocer el comportamiento de vinculación ACP compartida.

## Patrones de implementación

<AccordionGroup>
  <Accordion title="Usuario de macOS de bot dedicado (identidad de iMessage separada)">
    Utilice un ID de Apple y un usuario de macOS dedicados para que el tráfico del bot esté aislado de su perfil personal de Mensajes.

    Flujo típico:

    1. Cree/inicie sesión en un usuario de macOS dedicado.
    2. Inicie sesión en Mensajes con el ID de Apple del bot en ese usuario.
    3. Instale `imsg` en ese usuario.
    4. Cree un contenedor SSH para que OpenClaw pueda ejecutar `imsg` en ese contexto de usuario.
    5. Apunte `channels.imessage.accounts.<id>.cliPath` y `.dbPath` a ese perfil de usuario.

    La primera ejecución puede requerir aprobaciones de la interfaz gráfica (Automatización + Acceso total al disco) en esa sesión de usuario del bot.

  </Accordion>

  <Accordion title="Mac remoto a través de Tailscale (ejemplo)">
    Topología común:

    - la puerta de enlace se ejecuta en Linux/VM
    - iMessage + `imsg` se ejecutan en una Mac en su tailnet
    - el wrapper `cliPath` utiliza SSH para ejecutar `imsg`
    - `remoteHost` habilita la recuperación de adjuntos SCP

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

    Cada cuenta puede anular campos como `cliPath`, `dbPath`, `allowFrom`, `groupPolicy`, `mediaMaxMb`, configuración del historial y listas de permitidos de raíz de adjuntos.

  </Accordion>
</AccordionGroup>

## Medios, fragmentación y objetivos de entrega

<AccordionGroup>
  <Accordion title="Adjuntos y medios">
    - la ingesta de adjuntos entrantes está **desactivada de forma predeterminada**; establezca `channels.imessage.includeAttachments: true` para reenviar fotos, notas de voz, videos y otros adjuntos al agente. Con esto desactivado, los iMessages que solo contienen adjuntos se descartan antes de llegar al agente y pueden no producir ninguna línea de registro `Inbound message` en absoluto.
    - las rutas de adjuntos remotos se pueden recuperar a través de SCP cuando se establece `remoteHost`
    - las rutas de los adjuntos deben coincidir con las raíces permitidas:
      - `channels.imessage.attachmentRoots` (local)
      - `channels.imessage.remoteAttachmentRoots` (modo SCP remoto)
      - patrón de raíz predeterminado: `/Users/*/Library/Messages/Attachments`
    - SCP utiliza verificación estricta de clave de host (`StrictHostKeyChecking=yes`)
    - el tamaño de medio saliente utiliza `channels.imessage.mediaMaxMb` (predeterminado 16 MB)

  </Accordion>

  <Accordion title="Segmentación de salida">
    - límite de fragmento de texto: `channels.imessage.textChunkLimit` (predeterminado 4000)
    - modo de fragmento: `channels.imessage.chunkMode`
      - `length` (predeterminado)
      - `newline` (división primero por párrafo)

  </Accordion>

  <Accordion title="Formatos de direccionamiento">
    Destinos explícitos preferidos:

    - `chat_id:123` (recomendado para un enrutamiento estable)
    - `chat_guid:...`
    - `chat_identifier:...`

    También se admiten destinos de identificador:

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>

## Acciones de API privada

Cuando `imsg launch` se está ejecutando y `openclaw channels status --probe` informa `privateApi.available: true`, la herramienta de mensajes puede usar acciones nativas de iMessage además de los envíos de texto normales.

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
    - **react**: Añadir/eliminar tapbacks de iMessage (`messageId`, `emoji`, `remove`). Los tapbacks admitidos se corresponden con love (me encanta), like (me gusta), dislike (no me gusta), laugh (me divierte), emphasize (destacar) y question (pregunta).
    - **reply**: Enviar una respuesta en hilo a un mensaje existente (`messageId`, `text` o `message`, además de `chatGuid`, `chatId`, `chatIdentifier`, o `to`).
    - **sendWithEffect**: Enviar texto con un efecto de iMessage (`text` o `message`, `effect` o `effectId`).
    - **edit**: Editar un mensaje enviado en versiones compatibles de macOS/API privada (`messageId`, `text` o `newText`).
    - **unsend**: Retirar un mensaje enviado en versiones compatibles de macOS/API privada (`messageId`).
    - **upload-file**: Enviar medios/archivos (`buffer` como base64 o un/a `media`/`path`/`filePath` hidratado/a, `filename`, `asVoice` opcional). Alias heredado: `sendAttachment`.
    - **renameGroup**, **setGroupIcon**, **addParticipant**, **removeParticipant**, **leaveGroup**: Gestionar chats grupales cuando el objetivo actual es una conversación grupal.

  </Accordion>

  <Accordion title="ID de mensajes">
    El contexto entrante de iMessage incluye tanto valores cortos de `MessageSid` como GUIDs de mensaje completos cuando están disponibles. Los ID cortos tienen como ámbito la caché de respuestas reciente en memoria y se verifican contra el chat actual antes de su uso. Si un ID corto ha caducado o pertenece a otro chat, inténtelo de nuevo con el `MessageSidFull` completo.

  </Accordion>

  <Accordion title="Detección de capacidades">
    OpenClaw oculta las acciones de la API privada solo cuando el estado de la sonda en caché indica que el puente no está disponible. Si el estado es desconocido, las acciones permanecen visibles y envían sondas de forma diferida para que la primera acción pueda tener éxito después de `imsg launch` sin una actualización manual separada del estado.

  </Accordion>

  <Accordion title="Confirmaciones de lectura y escritura">
    Cuando el puente de la API privada está activo, los chats entrantes aceptados se marcan como leídos antes del despacho y se muestra una burbuja de escritura al remitente mientras el agente genera. Desactive el marcado de lectura con:

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    Las versiones de `imsg` anteriores a la lista de capacidades por método bloquearán silenciosamente la escritura/lectura; OpenClaw registra una advertencia única por reinicio para que la confirmación faltante sea atribuible.

  </Accordion>

  <Accordion title="Tapbacks entrantes">
    OpenClaw se suscribe a los tapbacks de iMessage y enruta las reacciones aceptadas como eventos del sistema en lugar de texto de mensaje normal, por lo que un tapback del usuario no activa un bucle de respuesta ordinario.

    El modo de notificación se controla mediante `channels.imessage.reactionNotifications`:

    - `"own"` (predeterminado): notificar solo cuando los usuarios reaccionan a mensajes creados por el bot.
    - `"all"`: notificar todos los tapbacks entrantes de remitentes autorizados.
    - `"off"`: ignorar los tapbacks entrantes.

    Las anulaciones por cuenta utilizan `channels.imessage.accounts.<id>.reactionNotifications`.

  </Accordion>
</AccordionGroup>

## Escrituras de configuración

iMessage permite escrituras de configuración iniciadas por el canal de forma predeterminada (para `/config set|unset` cuando `commands.config: true`).

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

## Combinación de MDs de envío dividido (comando + URL en una sola composición)

Cuando un usuario escribe un comando y una URL juntos — p. ej. `Dump https://example.com/article` —, la aplicación Mensajes de Apple divide el envío en **dos filas `chat.db` separadas**:

1. Un mensaje de texto (`"Dump"`).
2. Un globo de vista previa de URL (`"https://..."`) con imágenes de vista previa OG como archivos adjuntos.

Las dos filas llegan a OpenClaw con ~0.8-2.0 s de diferencia en la mayoría de configuraciones. Sin la fusión, el agente recibe solo el comando en el turno 1, responde (a menudo "envíame la URL") y solo ve la URL en el turno 2, momento en el que el contexto del comando ya se ha perdido. Este es el canal de envío de Apple, no algo que introduzca OpenClaw o `imsg`.

`channels.imessage.coalesceSameSenderDms` opta por fusionar filas consecutivas del mismo remitente en un solo turno de agente para un MD. Los chats de grupo siguen enviando mensaje por mensaje para preservar la estructura de turnos de varios usuarios.

<Tabs>
  <Tab title="Cuándo habilitar">
    Habilite cuando:

    - Envíe habilidades que esperan `command + payload` en un mensaje (volcado, pegar, guardar, cola, etc.).
    - Sus usuarios peguen URL, imágenes o contenido largo junto con los comandos.
    - Pueda aceptar la latencia adicional de turno en el MD (ver abajo).

    Deje deshabilitado cuando:

    - Necesite una latencia de comando mínima para activadores de MD de una sola palabra.
    - Todos sus flujos sean comandos de un solo tiro sin seguimientos de carga útil.

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

    Con la bandera activada y sin `messages.inbound.byChannel.imessage` explícito, la ventana de antirrebote se amplía a **2500 ms** (el valor predeterminado heredado es 0 ms: sin antirrebote). Se requiere la ventana más amplia porque el ritmo de envío dividido de Apple de 0.8-2.0 s no encaja en un valor predeterminado más estricto.

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
    - **Latencia añadida para mensajes DM.** Con la bandera activada, cada mensaje directo (incluidos los comandos de control independientes y los seguimientos de texto único) espera hasta la ventana de antirrebote antes del envío, por si viene una fila de carga útil. Los mensajes de chat de grupo mantienen el envío instantáneo.
    - **La salida combinada está limitada.** El texto combinado se limita a 4000 caracteres con un marcador explícito `…[truncated]`; los adjuntos se limitan a 20; las entradas de origen se limitan a 10 (se conservan la primera y la última más allá de eso). Cada GUID de origen se rastrea en `coalescedMessageGuids` para telemetría posterior.
    - **Solo para MD.** Los chats de grupo pasan al envío por mensaje para que el bot siga respondiendo cuando varias personas estén escribiendo.
    - **Opcional, por canal.** Otros canales (Telegram, WhatsApp, Slack, ...) no se ven afectados. Las configuraciones heredadas de BlueBubbles que establecen `channels.bluebubbles.coalesceSameSenderDms` deben migrar ese valor a `channels.imessage.coalesceSameSenderDms`.

  </Tab>
</Tabs>

### Escenarios y lo que ve el agente

| Usuario compone                                                                     | `chat.db` produce           | Bandera desactivada (predeterminado)                | Bandera activada + ventana de 2500 ms                                                      |
| ----------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Dump https://example.com` (un envío)                                               | 2 filas a ~1 s de distancia | Dos turnos del agente: "Dump" solo, luego la URL    | Un turno: texto combinado `Dump https://example.com`                                       |
| `Save this 📎image.jpg caption` (adjunto + texto)                                   | 2 filas                     | Dos turnos (archivo adjunto descartado al combinar) | Un turno: texto + imagen conservados                                                       |
| `/status` (comando independiente)                                                   | 1 fila                      | Envío instantáneo                                   | **Esperar hasta la ventana, luego enviar**                                                 |
| URL pegada sola                                                                     | 1 fila                      | Envío instantáneo                                   | Envío instantáneo (solo una entrada en el cubo)                                            |
| Texto + URL enviados como dos mensajes separados deliberados, minutos de diferencia | 2 filas fuera de la ventana | Dos turnos                                          | Dos turnos (la ventana caduca entre ellos)                                                 |
| Inundación rápida (>10 MD pequeños dentro de la ventana)                            | N filas                     | N turnos                                            | Un turno, salida limitada (primera + última, límites de texto/archivos adjuntos aplicados) |
| Dos personas escribiendo en un chat de grupo                                        | N filas de M remitentes     | M+ turnos (uno por cubo de remitente)               | M+ turnos — los chats de grupo no se combinan                                              |

## Poniéndose al día después del tiempo de inactividad de la puerta de enlace

Cuando la puerta de enlace está desconectada (fallo, reinicio, suspensión de Mac, apagado del equipo), `imsg watch` se reanuda desde el estado actual `chat.db` una vez que la puerta de enlace vuelve a estar en línea; por defecto, nunca se ve nada que haya llegado durante el lapso. La función de puesta al día reproduce esos mensajes en el siguiente inicio para que el agente no pierda silenciosamente el tráfico entrante.

La función de puesta al día está **desactivada de forma predeterminada**. Actívela por canal:

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

Un pase por cada inicio de `monitorIMessageProvider`, secuenciado como `imsg launch` listo → `watch.subscribe` → `performIMessageCatchup` → bucle de envío en vivo. La propia puesta al día utiliza `chats.list` + `messages.history` por chat contra el mismo cliente JSON-RPC que utiliza `imsg watch`. Cualquier cosa que llegue durante el pase de puesta al día fluye normalmente a través del envío en vivo; el caché de deduplicación de entrada absorbe cualquier solapamiento con las filas reproducidas.

Cada fila reproducida se alimenta a través de la ruta de envío en vivo (`evaluateIMessageInbound` + `dispatchInboundMessage`), por lo que las listas de permitidos, la política de grupos, el antirrebote, el caché de eco y los recibos de lectura se comportan de manera idéntica en los mensajes reproducidos y en vivo.

### Semántica del cursor y de reintentos

La recuperación mantiene un cursor por cuenta en `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` (el directorio de estado de OpenClaw por defecto es `~/.openclaw`, sobrescribible con `OPENCLAW_STATE_DIR`):

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- El cursor avanza en cada despacho exitoso y se mantiene cuando el despacho de una fila falla; el siguiente inicio reintenta la misma fila desde el cursor mantenido.
- Después de `maxFailureRetries` excepciones consecutivas contra el mismo `guid`, la recuperación registra un `warn` y fuerza el avance del cursor más allá del mensaje bloqueado para que los inicios posteriores puedan progresar.
- Los GUID ya descartados se omiten a la vista (sin intento de envío) en ejecuciones posteriores y se cuentan en `skippedGivenUp` en el resumen de ejecución.

### Señales visibles para el operador

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

Una línea `WARN ... capped to perRunLimit` significa que un solo inicio no drenó el retraso completo. Aumente `perRunLimit` (máx. 500) si sus brechas exceden regularmente el pase predeterminado de 50 filas.

### Cuándo dejarla desactivada

- El Gateway se ejecuta continuamente con watchdog de reinicio automático y las lagunas son siempre de < unos pocos segundos; el valor predeterminado de desactivado está bien.
- El volumen de DM es bajo y los mensajes perdidos no cambiarían el comportamiento del agente: la ventana inicial `firstRunLookbackMinutes` puede enviar un contexto antiguo sorprendente en la primera activación.

Cuando activa la recuperación, el primer inicio sin cursor solo mira hacia atrás `firstRunLookbackMinutes` (30 min por defecto), no la ventana completa `maxAgeMinutes`; esto evita reproducir una larga historia de mensajes previos a la activación.

## Solución de problemas

<AccordionGroup>
  <Accordion title="imsg not found or RPC unsupported">
    Valide el binario y el soporte RPC:

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    Si el sondeo informa que RPC no es compatible, actualice `imsg`. Si las acciones de API privada no están disponibles, ejecute `imsg launch` en la sesión de usuario de macOS iniciada y sondee nuevamente. Si la Gateway no se está ejecutando en macOS, use la configuración de Mac remoto a través de SSH anterior en lugar de la ruta predeterminada local `imsg`.

  </Accordion>

  <Accordion title="Gateway no se está ejecutando en macOS">
    El `cliPath: "imsg"` predeterminado debe ejecutarse en el Mac conectado a Mensajes. En Linux o Windows, configure `channels.imessage.cliPath` en un script contenedor que se conecte por SSH a ese Mac y ejecute `imsg "$@"`.

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    Luego ejecute:

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion title="Se ignoran los MDs">
    Compruebe:

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - aprobaciones de emparejamiento (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="Se ignoran los mensajes grupales">
    Compruebe:

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - comportamiento de la lista blanca (allowlist) de `channels.imessage.groups`
    - configuración del patrón de mención (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Fallo en los adjuntos remotos">
    Compruebe:

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - autenticación de clave SSH/SCP desde el host de la puerta de enlace
    - la clave del host existe en `~/.ssh/known_hosts` en el host de la puerta de enlace
    - legibilidad de la ruta remota en el Mac que ejecuta Mensajes

  </Accordion>

  <Accordion title="Se pasaron por alto los avisos de permisos de macOS">
    Vuelva a ejecutar en una terminal GUI interactiva en el mismo contexto de usuario/sesión y apruebe los avisos:

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    Confirme que se haya otorgado Acceso total al disco + Automatización para el contexto del proceso que ejecuta OpenClaw/`imsg`.

  </Accordion>
</AccordionGroup>

## Punteros de referencia de configuración

- [Referencia de configuración - iMessage](/es/gateway/config-channels#imessage)
- [Configuración de la puerta de enlace](/es/gateway/configuration)
- [Emparejamiento](/es/channels/pairing)

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Eliminación de BlueBubbles y la ruta de iMessage imsg](/es/announcements/bluebubbles-imessage) — anuncio y resumen de migración
- [Procedente de BlueBubbles](/es/channels/imessage-from-bluebubbles) — tabla de traducción de configuración y transición paso a paso
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento de DM
- [Grupos](/es/channels/groups) — comportamiento del chat en grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
