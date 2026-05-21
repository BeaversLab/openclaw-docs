---
summary: "Soporte nativo de iMessage a través de imsg (JSON-RPC sobre stdio), con acciones de API privada para respuestas, tapbacks, efectos, archivos adjuntos y gestión de grupos. Preferido para nuevas configuraciones de OpenClaw iMessage cuando los requisitos del host se ajustan."
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
Para los despliegues de iMessage de OpenClaw, use `imsg` en un host de macOS de Messages con sesión iniciada. Si su Gateway se ejecuta en Linux o Windows, apunte `channels.imessage.cliPath` a un contenedor SSH que ejecute `imsg` en el Mac.

**La recuperación por tiempo de inactividad del Gateway es opcional.** Cuando está habilitada (`channels.imessage.catchup.enabled: true`), el gateway reproduce los mensajes entrantes que llegaron a `chat.db` mientras estaba desconectado (falla, reinicio, suspensión del Mac) en el próximo inicio. Deshabilitado de manera predeterminada; consulte [Catching up after gateway downtime](#catching-up-after-gateway-downtime). Cierra [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649).

</Note>

<Warning>
  Se eliminó el soporte de BlueBubbles. Migre las configuraciones `channels.bluebubbles` a `channels.imessage`; OpenClaw admite iMessage solo a través de `imsg`. Comience con [BlueBubbles removal and the imsg iMessage path](/es/announcements/bluebubbles-imessage) para el anuncio breve, o [Coming from BlueBubbles](/es/channels/imessage-from-bluebubbles) para la tabla completa de migración.
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

  <Tab title="Mac remoto a través de SSH">
    OpenClaw solo requiere un `cliPath` compatible con stdio, por lo que puedes apuntar `cliPath` a un script wrapper que haga SSH a un Mac remoto y ejecute `imsg`.

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

    Si `remoteHost` no está configurado, OpenClaw intenta detectarlo automáticamente analizando el script wrapper de SSH.
    `remoteHost` debe ser `host` o `user@host` (sin espacios ni opciones de SSH).
    OpenClaw utiliza verificación estricta de clave de host para SCP, por lo que la clave de host del relay ya debe existir en `~/.ssh/known_hosts`.
    Las rutas de los adjuntos se validan contra las raíces permitidas (`attachmentRoots` / `remoteAttachmentRoots`).

<Warning>
Cualquier wrapper `cliPath` o proxy SSH que pongas delante de `imsg` DEBE comportarse como una tubería (pipe) stdio transparente para JSON-RPC de larga duración. OpenClaw intercambia pequeños mensajes JSON-RPC delimitados por nuevas líneas a través del stdin/stdout del wrapper durante la vida útil del canal:

- Reenvía cada fragmento/línea stdin **tan pronto como los bytes estén disponibles** — no esperes a EOF.
- Reenvía cada fragmento/línea stdout prontamente en la dirección opuesta.
- Preserva las líneas nuevas.
- Evita lecturas de bloqueo de tamaño fijo (`read(4096)`, `cat | buffer`, shell predeterminado `read`) que puedan inanitar (starve) pequeños fragmentos.
- Mantén stderr separado del flujo stdout de JSON-RPC.

Un wrapper que almacene en búfer el stdin hasta que se llene un bloque grande producirá síntomas que parecen una interrupción de iMessage — `imsg rpc timeout (chats.list)` o reinicios repetidos del canal — aunque `imsg rpc` en sí esté sano. `ssh -T host imsg "$@"` (arriba) es seguro porque reenvía los argumentos `cliPath` de OpenClaw tales como `rpc` y `--db`. Las tuberías como `ssh host imsg | grep -v '^DEBUG'` NO son seguras — las herramientas con búfer de línea aún pueden retener fragmentos; usa `stdbuf -oL -eL` en cada etapa si debes filtrar.

</Warning>

  </Tab>
</Tabs>

## Requisitos y permisos (macOS)

- Se debe iniciar sesión en Messages en el Mac donde se ejecuta `imsg`.
- Se requiere acceso completo al disco para el contexto del proceso que ejecuta OpenClaw/`imsg` (acceso a la base de datos de Messages).
- Se requiere permiso de automatización para enviar mensajes a través de Messages.app.
- Para acciones avanzadas (reaccionar / editar / desenviar / respuesta en hilo / efectos / operaciones de grupo), se debe desactivar la Protección de Integridad del Sistema; consulte [Habilitar la API privada imsg](#enabling-the-imsg-private-api) a continuación. El envío y recepción básico de texto y medios funcionan sin ella.

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

- **Modo básico** (predeterminado, no se requieren cambios de SIP): texto y medios salientes a través de `send`, visualización/historial entrante, lista de chats. Esto es lo que obtiene de inmediato con una instalación nueva de `brew install steipete/tap/imsg` más los permisos estándar de macOS mencionados anteriormente.
- **Modo de API privada**: `imsg` inyecta una dylib auxiliar en `Messages.app` para llamar a funciones internas de `IMCore`. Esto es lo que desbloquea `react`, `edit`, `unsend`, `reply` (en hilo), `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, además de indicadores de escritura y confirmaciones de lectura.

Para alcanzar la superficie de acción avanzada que documenta esta página del canal, necesita el modo de API privada. El README de `imsg` es explícito sobre el requisito:

> Las funciones avanzadas como `read`, `typing`, `launch`, envío enriquecido con puente, mutación de mensajes y gestión de chats son opcionales. Requieren que SIP esté desactivado y que se inyecte una dylib auxiliar en `Messages.app`. `imsg launch` se niega a inyectar cuando SIP está activado.

La técnica de inyección auxiliar utiliza la propia dylib de `imsg` para acceder a las API privadas de Messages. No hay servidor de terceros ni tiempo de ejecución de BlueBubbles en la ruta iMessage de OpenClaw.

<Warning>
**Deshabilitar SIP es una compensación de seguridad real.** SIP es una de las protecciones centrales de macOS contra la ejecución de código del sistema modificado; desactivarlo en todo el sistema abre una superficie de ataque adicional y efectos secundarios. En particular, **deshabilitar SIP en Macs con Apple Silicon también deshabilita la capacidad de instalar y ejecutar apps de iOS en tu Mac**.

Trata esto como una elección operacional deliberada, no como un valor predeterminado. Si tu modelo de amenazas no tolera que SIP esté desactivado, iMessage incluido se limita al modo básico — solo envío y recepción de texto y medios, sin reacciones / editar / no enviar / efectos / operaciones de grupo.

</Warning>

### Configuración

1. **Instale (o actualice) `imsg`** en el Mac que ejecuta Messages.app:

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   La salida de `imsg status --json` informa sobre `bridge_version`, `rpc_methods` y `selectors` por método, para que puedas ver qué es compatible con la compilación actual antes de comenzar.

2. **Deshabilita la Protección de Integridad del Sistema.** Esto es específico de la versión de macOS porque el requisito subyacente de Apple depende del sistema operativo y el hardware:
   - **macOS 10.13–10.15 (Sierra–Catalina):** desactiva la validación de bibliotecas (Library Validation) mediante la Terminal, reinicia en modo de recuperación, ejecuta `csrutil disable`, reinicia.
   - **macOS 11+ (Big Sur y posteriores), Intel:** Modo de recuperación (o recuperación por internet), `csrutil disable`, reinicia.
   - **macOS 11+, Apple Silicon:** secuencia de inicio con el botón de encendido para entrar en recuperación; en versiones recientes de macOS mantén pulsada la tecla **Left Shift** (Shift izquierdo) al hacer clic en Continuar y luego `csrutil disable`. Las configuraciones de máquina virtual siguen un flujo separado: toma primero una instantánea de la VM.
   - **macOS 26 / Tahoe:** las políticas de validación de bibliotecas y las comprobaciones de derechos privados (private-entitlement) de `imagent` se han ajustado aún más; `imsg` puede necesitar una compilación actualizada para mantenerse al día. Si la inyección de `imsg launch` o `selectors` específicos comienzan a devolver falso después de una actualización mayor de macOS, consulta las notas de la versión de `imsg` antes de asumir que el paso de SIP se realizó correctamente.

   Sigue el flujo del modo de recuperación de Apple para tu Mac para desactivar SIP antes de ejecutar `imsg launch`.

3. **Inyecta el asistente.** Con SIP deshabilitado y Messages.app iniciado:

   ```bash
   imsg launch
   ```

   `imsg launch` se niega a inyectar cuando SIP aún está habilitado, por lo que esto también sirve como confirmación de que el paso 2 se realizó.

4. **Verifica el puente desde OpenClaw:**

   ```bash
   openclaw channels status --probe
   ```

   La entrada de iMessage debe informar `works` y `imsg status --json | jq '.selectors'` debería mostrar `retractMessagePart: true` además de los selectores de edición / escritura / lectura que exponga tu compilación de macOS. El filtrado por método del complemento OpenClaw en `actions.ts` solo anuncia acciones cuyo selector subyacente sea `true`, por lo que la superficie de acción que ves en la lista de herramientas del agente refleja lo que el puente puede hacer realmente en este host.

Si `openclaw channels status --probe` indica el canal como `works` pero acciones específicas lanzan "iMessage `<action>` requiere el puente de la API privada imsg" en el momento del envío, ejecute `imsg launch` nuevamente: el asistente puede desactivarse (reinicio de Messages.app, actualización del SO, etc.) y el estado `available: true` en caché seguirá anunciando acciones hasta que la siguiente sondeo actualice.

### Cuando no puedes deshabilitar SIP

Si tener SIP deshabilitado no es aceptable para tu modelo de amenazas:

- `imsg` vuelve al modo básico — texto + multimedia + solo recepción.
- El complemento OpenClaw todavía anuncia el envío de texto/multimedia y la monitoreo de entrada; solo oculta `react`, `edit`, `unsend`, `reply`, `sendWithEffect` y operaciones de grupo de la superficie de acción (según la puerta de capacidad por método).
- Puede ejecutar un Mac separado sin Apple Silicon (o un Mac bot dedicado) con SIP desactivado para la carga de trabajo de iMessage, mientras mantiene SIP habilitado en sus dispositivos principales. Consulte [Usuario de macOS de bot dedicado (identidad iMessage separada)](#deployment-patterns) a continuación.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.imessage.dmPolicy` controla los mensajes directos:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    Campo de lista de permitidos: `channels.imessage.allowFrom`.

    Las entradas de la lista de permitidos deben identificar a los remitentes: identificadores o grupos de acceso de remitente estáticos (`accessGroup:<name>`). Use `channels.imessage.groupAllowFrom` para objetivos de chat como `chat_id:*`, `chat_guid:*` o `chat_identifier:*`; use `channels.imessage.groups` para claves de registro numéricas `chat_id`.

  </Tab>

  <Tab title="Política de grupo y menciones">
    `channels.imessage.groupPolicy` controla el manejo de grupos:

    - `allowlist` (predeterminado cuando se configura)
    - `open`
    - `disabled`

    Lista blanca de remitentes de grupo: `channels.imessage.groupAllowFrom`.

    Las entradas `groupAllowFrom` también pueden hacer referencia a grupos de acceso de remitentes estáticos (`accessGroup:<name>`).

    Respaldo en tiempo de ejecución: si `groupAllowFrom` no está configurado, las comprobaciones de remitente de grupo de iMessage usan `allowFrom`; configure `groupAllowFrom` cuando la admisión de MD y grupos deba diferir.
    Nota de tiempo de ejecución: si `channels.imessage` falta por completo, el tiempo de ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está configurado).

    <Warning>
    El enrutamiento de grupos tiene **dos** puertas de lista blanca ejecutándose una tras otra, y ambas deben pasar:

    1. **Lista blanca de remitente/destino de chat** (`channels.imessage.groupAllowFrom`) — identificador, `chat_guid`, `chat_identifier` o `chat_id`.
    2. **Registro de grupos** (`channels.imessage.groups`) — con `groupPolicy: "allowlist"`, esta puerta requiere una entrada de comodín `groups: { "*": { ... } }` (establece `allowAll = true`) o una entrada explícita por `chat_id` bajo `groups`.

    Si la puerta 2 no tiene nada, se descarta cada mensaje de grupo. El complemento emite dos señales de nivel `warn` en el nivel de registro predeterminado:

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
    - sin patrones configurados, no se puede aplicar el filtrado de menciones

    Los comandos de control de remitentes autorizados pueden omitir el filtrado de menciones en grupos.

    `systemPrompt` por grupo:

    Cada entrada bajo `channels.imessage.groups.*` acepta una cadena `systemPrompt` opcional. El valor se inyecta en el indicador del sistema del agente en cada turno que maneja un mensaje en ese grupo. La resolución refleja la resolución del indicador por grupo utilizada por `channels.whatsapp.groups`:

    1. **Indicador del sistema específico del grupo** (`groups["<chat_id>"].systemPrompt`): se usa cuando existe la entrada específica del grupo en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), se suprime el comodín y no se aplica ningún indicador del sistema a ese grupo.
    2. **Indicador del sistema de comodín de grupo** (`groups["*"].systemPrompt`): se usa cuando la entrada específica del grupo falta por completo del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

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

    Los indicadores por grupo solo se aplican a mensajes grupales; los mensajes directos en este canal no se ven afectados.

  </Tab>

  <Tab title="Sesiones y respuestas deterministas">
    - Los MD usan enrutamiento directo; los grupos usan enrutamiento de grupo.
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

- Ejecute `/acp spawn codex --bind here` dentro del MD o el chat de grupo permitido.
- Los mensajes futuros en esa misma conversación de iMessage se enrutan a la sesión ACP generada.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina la vinculación.

Las vinculaciones persistentes configuradas son compatibles a través de entradas `bindings[]` de nivel superior con `type: "acp"` y `match.channel: "imessage"`.

`match.peer.id` puede usar:

- identificador de MD normalizado como `+15555550123` o `user@example.com`
- `chat_id:<id>` (recomendado para vinculaciones de grupo estables)
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

Consulte [Agentes ACP](/es/tools/acp-agents) para conocer el comportamiento de vinculación ACP compartida.

## Patrones de implementación

<AccordionGroup>
  <Accordion title="Usuario macOS de bot dedicado (identidad de iMessage separada)">
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

    - el gateway se ejecuta en Linux/VM
    - iMessage + `imsg` se ejecutan en una Mac en su tailnet
    - el wrapper `cliPath` usa SSH para ejecutar `imsg`
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

    Use claves SSH para que tanto SSH como SCP sean no interactivos.
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
    - la ingesta de adjuntos entrantes está **desactivada por defecto** — configure `channels.imessage.includeAttachments: true` para reenviar fotos, notas de voz, video y otros adjuntos al agente. Con esto deshabilitado, los iMessage que solo contienen adjuntos se descartan antes de llegar al agente y pueden no producir ninguna línea de registro `Inbound message`.
    - las rutas de adjuntos remotos se pueden recuperar a través de SCP cuando `remoteHost` está configurado
    - las rutas de los adjuntos deben coincidir con las raíces permitidas:
      - `channels.imessage.attachmentRoots` (local)
      - `channels.imessage.remoteAttachmentRoots` (modo SCP remoto)
      - patrón de raíz predeterminado: `/Users/*/Library/Messages/Attachments`
    - SCP usa verificación estricta de clave de host (`StrictHostKeyChecking=yes`)
    - el tamaño de medio saliente usa `channels.imessage.mediaMaxMb` (predeterminado 16 MB)

  </Accordion>

  <Accordion title="Fragmentación de salida">
    - límite de fragmento de texto: `channels.imessage.textChunkLimit` (predeterminado 4000)
    - modo de fragmentación: `channels.imessage.chunkMode`
      - `length` (predeterminado)
      - `newline` (división por párrafos primero)

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
    - **react**: Añadir/eliminar respuestas rápidas de iMessage (`messageId`, `emoji`, `remove`). Las respuestas rápidas compatibles se corresponden con me gusta, no me gusta, amor, risa, énfasis y pregunta.
    - **reply**: Enviar una respuesta en hilo a un mensaje existente (`messageId`, `text` o `message`, más `chatGuid`, `chatId`, `chatIdentifier`, o `to`).
    - **sendWithEffect**: Enviar texto con un efecto de iMessage (`text` o `message`, `effect` o `effectId`).
    - **edit**: Editar un mensaje enviado en versiones compatibles de macOS/private API (`messageId`, `text` o `newText`).
    - **unsend**: Retirar un mensaje enviado en versiones compatibles de macOS/private API (`messageId`).
    - **upload-file**: Enviar medios/archivos (`buffer` como base64 o un `media`/`path`/`filePath` hidratado, `filename`, `asVoice` opcional). Alias heredado: `sendAttachment`.
    - **renameGroup**, **setGroupIcon**, **addParticipant**, **removeParticipant**, **leaveGroup**: Gestionar chats grupales cuando el objetivo actual es una conversación grupal.

  </Accordion>

  <Accordion title="ID de mensaje">
    El contexto entrante de iMessage incluye valores cortos `MessageSid` y GUID completos de mensajes cuando están disponibles. Los ID cortos están limitados al caché de respuestas en memoria reciente y se verifican contra el chat actual antes de su uso. Si un ID corto ha caducado o pertenece a otro chat, inténtelo de nuevo con el `MessageSidFull` completo.

  </Accordion>

  <Accordion title="Detección de capacidades">
    OpenClaw oculta las acciones de la API privada solo cuando el estado de la sonda en caché indica que el puente no está disponible. Si el estado es desconocido, las acciones permanecen visibles y envían sondas de forma diferida para que la primera acción pueda tener éxito después de `imsg launch` sin una actualización manual separada del estado.

  </Accordion>

  <Accordion title="Confirmaciones de lectura y escritura">
    Cuando el puente de la API privada está activo, los chats entrantes aceptados se marcan como leídos antes del envío y se muestra una burbuja de escritura al remitente mientras el agente se genera. Desactive el marcado de lectura con:

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

  <Accordion title="Tapbacks entrantes">
    OpenClaw se suscribe a los tapbacks de iMessage y enruta las reacciones aceptadas como eventos del sistema en lugar de texto de mensaje normal, por lo que un tapback de usuario no activa un bucle de respuesta ordinario.

    El modo de notificación se controla mediante `channels.imessage.reactionNotifications`:

    - `"own"` (predeterminado): notificar solo cuando los usuarios reaccionan a mensajes creados por el bot.
    - `"all"`: notificar para todos los tapbacks entrantes de remitentes autorizados.
    - `"off"`: ignorar los tapbacks entrantes.

    Las anulaciones por cuenta usan `channels.imessage.accounts.<id>.reactionNotifications`.

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

Cuando un usuario escribe un comando y una URL juntos —por ejemplo, `Dump https://example.com/article`— la aplicación Mensajes de Apple divide el envío en **dos filas `chat.db` separadas**:

1. Un mensaje de texto (`"Dump"`).
2. Un globo de vista previa de URL (`"https://..."`) con imágenes de vista previa OG como archivos adjuntos.

Las dos filas llegan a OpenClaw con una separación de ~0,8 a 2,0 s en la mayoría de las configuraciones. Sin la fusión, el agente recibe solo el comando en el turno 1, responde (a menudo "envíame la URL") y solo ve la URL en el turno 2; en ese punto, el contexto del comando ya se ha perdido. Este es el canal de envío de Apple, no algo que introduzca OpenClaw o `imsg`.

`channels.imessage.coalesceSameSenderDms` habilita la opción de fusionar filas consecutivas del mismo remitente en un solo turno de agente para un mensaje directo (DM). Los chats grupales siguen enviando mensaje por mensaje para preservar la estructura de turnos de varios usuarios.

<Tabs>
  <Tab title="Cuándo habilitar">
    Habilite cuando:

    - Implemente habilidades que esperen `command + payload` en un solo mensaje (volcado, pegar, guardar, cola, etc.).
    - Sus usuarios peguen URL, imágenes o contenido largo junto con comandos.
    - Pueda aceptar la latencia adicional de turno en el DM (ver más abajo).

    Deje deshabilitado cuando:

    - Necesite una latencia de comando mínima para activadores de DM de una sola palabra.
    - Todos sus flujos sean comandos de un solo tiro sin seguimientos de carga útil.

  </Tab>
  <Tab title="Habilitar">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    Con el indicador activado y sin `messages.inbound.byChannel.imessage` explícito, la ventana de antirrebote se amplía a **2500 ms** (el valor predeterminado heredado es 0 ms: sin antirrebote). Se requiere la ventana más amplia porque el cadencia de envio dividido de Apple de 0,8 a 2,0 s no cabe en un valor predeterminado más estricto.

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
  <Tab title="Compromisos">
    - **Mayor latencia para los MD.** Con la marca activada, cada MD (incluidos los comandos de control independientes y los seguimientos de texto único) espera hasta la ventana de antirrebote antes del envío, por si llega una fila de carga útil. Los mensajes de chat de grupo mantienen el envío instantáneo.
    - **La salida combinada está limitada.** El texto combinado se limita a 4000 caracteres con un marcador `…[truncated]` explícito; los archivos adjuntos se limitan a 20; las entradas de origen se limitan a 10 (se conservan la primera y la más allá de eso). Cada GUID de origen se rastrea en `coalescedMessageGuids` para telemetría descendente.
    - **Solo para MD.** Los chats de grupo pasan al envío por mensaje para que el bot siga respondiendo cuando varias personas estén escribiendo.
    - **Optativo, por canal.** Otros canales (Telegram, WhatsApp, Slack, …) no se ven afectados. Las configuraciones heredadas de BlueBubbles que establecen `channels.bluebubbles.coalesceSameSenderDms` deben migrar ese valor a `channels.imessage.coalesceSameSenderDms`.

  </Tab>
</Tabs>

### Escenarios y lo que ve el agente

| Usuario compone                                                                     | `chat.db` produce           | Bandera desactivada (predeterminado)                | Bandera activada + ventana de 2500 ms                                                      |
| ----------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Dump https://example.com` (un envío)                                               | 2 filas a ~1 s de distancia | Dos turnos del agente: "Dump" solo, luego la URL    | Un turno: texto combinado `Dump https://example.com`                                       |
| `Save this 📎image.jpg caption` (archivo adjunto + texto)                           | 2 filas                     | Dos turnos (archivo adjunto descartado al combinar) | Un turno: texto + imagen conservados                                                       |
| `/status` (comando independiente)                                                   | 1 fila                      | Envío instantáneo                                   | **Esperar hasta la ventana, luego enviar**                                                 |
| URL pegada sola                                                                     | 1 fila                      | Envío instantáneo                                   | Envío instantáneo (solo una entrada en el cubo)                                            |
| Texto + URL enviados como dos mensajes separados deliberados, minutos de diferencia | 2 filas fuera de la ventana | Dos turnos                                          | Dos turnos (la ventana caduca entre ellos)                                                 |
| Inundación rápida (>10 MD pequeños dentro de la ventana)                            | N filas                     | N turnos                                            | Un turno, salida limitada (primera + última, límites de texto/archivos adjuntos aplicados) |
| Dos personas escribiendo en un chat de grupo                                        | N filas de M remitentes     | M+ turnos (uno por cubo de remitente)               | M+ turnos — los chats de grupo no se combinan                                              |

## Poniéndose al día después del tiempo de inactividad de la puerta de enlace

Cuando el gateway está desconectado (fallos, reinicios, suspensión de Mac, apagado de la máquina), `imsg watch` se reanuda desde el estado actual `chat.db` una vez que el gateway vuelve a estar en línea; de forma predeterminada, cualquier cosa que haya llegado durante el tiempo de inactividad nunca se ve. La función de recuperación reproduce esos mensajes en el siguiente inicio para que el agente no pierda silenciosamente el tráfico entrante.

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

Un paso por cada inicio de `monitorIMessageProvider`, secuenciado como `imsg launch` listo → `watch.subscribe` → `performIMessageCatchup` → bucle de envío en vivo. La recuperación en sí misma utiliza `chats.list` + `messages.history` por chat contra el mismo cliente JSON-RPC utilizado por `imsg watch`. Cualquier cosa que llegue durante el paso de recuperación fluye normalmente a través del envío en vivo; la caché existente de deduplicación de entrada absorbe cualquier solapamiento con las filas reproducidas.

Cada fila reproducida se procesa a través de la ruta de despacho en vivo (`evaluateIMessageInbound` + `dispatchInboundMessage`), por lo que las listas de permitidos, la política de grupo, el antirrebote, la caché de eco y los confirmaciones de lectura se comportan de manera idéntica en los mensajes reproducidos y en vivo.

### Semántica del cursor y de reintentos

La recuperación mantiene un cursor por cuenta en `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` (el directorio de estado de OpenClaw predeterminado es `~/.openclaw`, modificable con `OPENCLAW_STATE_DIR`):

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- El cursor avanza en cada despacho exitoso y se mantiene cuando el despacho de una fila falla; el siguiente inicio reintenta la misma fila desde el cursor mantenido.
- Después de `maxFailureRetries` errores consecutivos contra el mismo `guid`, la recuperación registra un `warn` y fuerza el avance del cursor más allá del mensaje bloqueado para que los inicios posteriores puedan progresar.
- Los GUID ya descartados se omiten a la vista (sin intento de despacho) en ejecuciones posteriores y se cuentan bajo `skippedGivenUp` en el resumen de la ejecución.

### Señales visibles para el operador

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

Una línea `WARN ... capped to perRunLimit` significa que un solo inicio no drenó el retraso completo. Aumente `perRunLimit` (máx. 500) si sus vacíos exceden regularmente el pase predeterminado de 50 filas.

### Cuándo dejarla desactivada

- El Gateway se ejecuta continuamente con watchdog de reinicio automático y las lagunas son siempre de < unos pocos segundos; el valor predeterminado de desactivado está bien.
- El volumen de MD es bajo y los mensajes perdidos no cambiarían el comportamiento del agente: la ventana inicial de `firstRunLookbackMinutes` puede despachar un contexto antiguo sorprendente al habilitar por primera vez.

Cuando activa la recuperación, el primer inicio sin cursor solo mira hacia atrás `firstRunLookbackMinutes` (30 min predeterminado), no la ventana completa de `maxAgeMinutes` — esto evita reproducir una larga historia de mensajes previos a la habilitación.

## Solución de problemas

<AccordionGroup>
  <Accordion title="imsg not found or RPC unsupported">
    Valide el binario y el soporte RPC:

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    Si la prueba informa que RPC no es compatible, actualice `imsg`. Si las acciones de API privada no están disponibles, ejecute `imsg launch` en la sesión de usuario de macOS conectada y pruebe de nuevo. Si la puerta de enlace no se está ejecutando en macOS, use la configuración remota de Mac a través de SSH anterior en lugar de la ruta local predeterminada `imsg`.

  </Accordion>

  <Accordion title="Gateway is not running on macOS">
    El `cliPath: "imsg"` predeterminado debe ejecutarse en el Mac conectado a Messages. En Linux o Windows, configure `channels.imessage.cliPath` en un script contenedor que haga SSH a ese Mac y ejecute `imsg "$@"`.

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
    Verifique:

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - aprobaciones de emparejamiento (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="Group messages are ignored">
    Verifique:

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - comportamiento de la lista de permitidos de `channels.imessage.groups`
    - configuración del patrón de mención (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Remote attachments fail">
    Verifique:

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - autenticación de clave SSH/SCP desde el host de la puerta de enlace
    - la clave de host existe en `~/.ssh/known_hosts` en el host de la puerta de enlace
    - legibilidad de la ruta remota en el Mac que ejecuta Messages

  </Accordion>

  <Accordion title="macOS permission prompts were missed">
    Vuelva a ejecutar en una terminal de interfaz gráfica interactiva en el mismo contexto de usuario/sesión y apruebe los indicadores:

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    Confirme que se otorguen Acceso total al disco + Automatización para el contexto de proceso que ejecuta OpenClaw/`imsg`.

  </Accordion>
</AccordionGroup>

## Punteros de referencia de configuración

- [Referencia de configuración - iMessage](/es/gateway/config-channels#imessage)
- [Configuración de la puerta de enlace](/es/gateway/configuration)
- [Emparejamiento](/es/channels/pairing)

## Relacionado

- [Descripción general de canales](/es/channels) — todos los canales compatibles
- [Eliminación de BlueBubbles y la ruta iMessage de imsg](/es/announcements/bluebubbles-imessage) — anuncio y resumen de migración
- [Viniendo de BlueBubbles](/es/channels/imessage-from-bluebubbles) — tabla de traducción de configuración y transición paso a paso
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento de DM
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
