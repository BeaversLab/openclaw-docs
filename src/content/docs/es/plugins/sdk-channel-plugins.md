---
summary: "Guía paso a paso para crear un complemento de canal de mensajería para OpenClaw"
title: "Crear complementos de canal"
sidebarTitle: "Complementos de canal"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

Esta guía explica cómo crear un complemento de canal que conecte OpenClaw con una
plataforma de mensajería. Al final tendrás un canal funcional con seguridad de MD,
emparejamiento, hilos de respuesta y mensajería saliente.

<Info>Si no has creado ningún plugin de OpenClaw antes, lee primero [Cómo empezar](/es/plugins/building-plugins) para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

## Cómo funcionan los complementos de canal

Los plugins de canal no necesitan sus propias herramientas de envío/edición/reacción. OpenClaw mantiene una
herramienta `message` compartida en el núcleo. Tu plugin es dueño de:

- **Config** - resolución de cuenta y asistente de configuración
- **Seguridad** - política de MD y listas de permitidos
- **Emparejamiento** - flujo de aprobación de MD
- **Gramática de sesión** - cómo los IDs de conversación específicos del proveedor se asignan a chats base, IDs de hilo y respaldos principales
- **Saliente** - envío de texto, medios y encuestas a la plataforma
- **Hilos** - cómo se organizan las respuestas en hilos
- **Latido de escritura** - señales opcionales de escritura/ocupado para objetivos de entrega de latido

El núcleo es dueño de la herramienta de mensaje compartida, el cableado del prompt, la forma de la clave de sesión externa,
la contabilidad `:thread:` genérica y el despacho.

Los nuevos complementos de canal también deben exponer un adaptador `message` con
`defineChannelMessageAdapter` de `openclaw/plugin-sdk/channel-message`. El
adaptador declara qué capacidades de envío final duraderas son compatibles con el transporte nativo
y dirige los envíos de texto/medios a las mismas funciones de transporte que el
adaptador heredado `outbound`. Declare una capacidad solo cuando una prueba de contrato
demuestre el efecto secundario nativo y el recibo devuelto.
Para ver el contrato completo de la API, ejemplos, matriz de capacidades, reglas de recibo, finalización de
vista previa en vivo, política de confirmación de recepción, pruebas y tabla de migración, consulte
[Channel message API](/es/plugins/sdk-channel-message).
Si el adaptador `outbound` existente ya tiene los métodos de envío correctos y
metadatos de capacidad, use `createChannelMessageAdapterFromOutbound(...)` para
derivar el adaptador `message` en lugar de escribir manualmente otro puente.
Los envíos del adaptador deben devolver valores `MessageReceipt`. Cuando el código de compatibilidad
aún necesita identificadores heredados, derívelos con `listMessageReceiptPlatformIds(...)`
o `resolveMessageReceiptPrimaryId(...)` en lugar de mantener campos `messageIds`
paralelos en el nuevo código de ciclo de vida.
Los canales con capacidad de vista previa también deben declarar `message.live.capabilities` con
el ciclo de vida en vivo exacto que poseen, como `draftPreview`,
`previewFinalization`, `progressUpdates`, `nativeStreaming`, o
`quietFinalization`. Los canales que finalizan una vista previa de borrador en su lugar también
debe declarar `message.live.finalizer.capabilities`, como `finalEdit`,
`normalFallback`, `discardPending`, `previewReceipt`, y
`retainOnAmbiguousFailure`, y enrutar la lógica en tiempo de ejecución a través de
`defineFinalizableLivePreviewAdapter(...)` más
`deliverWithFinalizableLivePreviewAdapter(...)`. Mantenga esas capacidades respaldadas
por pruebas `verifyChannelMessageLiveCapabilityAdapterProofs(...)` y
`verifyChannelMessageLiveFinalizerProofs(...)` para que el comportamiento de vista previa nativa,
progreso, edición, reserva/retención, limpieza y recibo no pueda derivar
silenciosamente.
Los receptores entrantes que difieren las confirmaciones de la plataforma deben declarar
`message.receive.defaultAckPolicy` y `supportedAckPolicies` en lugar de ocultar
el momento de la confirmación en el estado local del monitor. Cubra cada política declarada con
`verifyChannelMessageReceiveAckPolicyAdapterProofs(...)`.

Los asistentes de respuesta/turno heredados, como `createChannelTurnReplyPipeline`,
`dispatchInboundReplyWithBase` y `recordInboundSessionAndDispatchReply`,
permanecen disponibles para dispatchers de compatibilidad. No use esos nombres para el nuevo
código de canal; los nuevos complementos deben comenzar con el adaptador `message`, recibos y
asistentes del ciclo de vida de recepción/envío en `openclaw/plugin-sdk/channel-message`.

Los canales que migran la autorización de entrada pueden usar la subruta experimental `openclaw/plugin-sdk/channel-ingress-runtime` desde las rutas de recepción en tiempo de ejecución. La subruta mantiene la búsqueda de la plataforma y los efectos secundarios en el complemento, mientras comparte la resolución del estado de la lista de permitidos, las decisiones de ruta/remitente/comando/evento/activación, el diagnóstico redactado y el mapeo de admisión de turnos. Mantenga la normalización de la identidad del complemento en el descriptor que pasa al solucionador; no serialice los valores de coincidencia sin procesar del estado o decisión resueltos. Consulte [Channel ingress API](/es/plugins/sdk-channel-ingress) para el diseño de la API, el límite de propiedad y las expectativas de prueba.

Si su canal admite indicadores de escritura fuera de las respuestas entrantes, exponga
`heartbeat.sendTyping(...)` en el complemento del canal. Core lo llama con el
objetivo de entrega de latido resuelto antes de que se inicie la ejecución del modelo de latido y
usa el ciclo de vida compartido de keepalive/limpieza de escritura. Agregue `heartbeat.clearTyping(...)`
cuando la plataforma necesite una señal de detención explícita.

Si su canal agrega parámetros de herramienta de mensaje que transportan fuentes de medios, exponga esos
nombres de parámetros a través de `describeMessageTool(...).mediaSourceParams`. Core usa
esa lista explícita para la normalización de rutas de sandbox y la política de acceso a medios de salida,
por lo que los complementos no necesitan casos especiales de núcleo compartido para parámetros de
avatar, archivo adjunto o imagen de portada específicos del proveedor.
Prefiera devolver un mapa con clave de acción como
`{ "set-profile": ["avatarUrl", "avatarPath"] }` para que las acciones no relacionadas no
hereden los argumentos de medios de otra acción. Una matriz plana aún funciona para parámetros que
se comparten intencionalmente en cada acción expuesta.

Si tu canal necesita un formado específico del proveedor para `message(action="send")`,
prefiere `actions.prepareSendPayload(...)`. Pon las tarjetas nativas, bloques, incrustaciones u
otros datos duraderos bajo `payload.channelData.<channel>` y deja que el núcleo realice
el envío real a través del adaptador de salida/mensaje. Usa
`actions.handleAction(...)` solo para enviar como alternativa de compatibilidad para
las cargas útiles que no se pueden serializar y reintentar.

Si tu plataforma almacena un alcance adicional dentro de los ids de conversación, mantén ese análisis
en el complemento con `messaging.resolveSessionConversation(...)`. Ese es el
enganche canónico para mapear `rawId` al id de conversación base, id de hilo opcional,
`baseConversationId` explícito y cualquier `parentConversationCandidates`.
Cuando devuelvas `parentConversationCandidates`, mantenlos ordenados del
padre más estrecho al más amplio/conversación base.

Usa `openclaw/plugin-sdk/channel-route` cuando el código del complemento necesite normalizar
campos tipo ruta, comparar un hilo secundario con su ruta principal, o construir una
clave de deduplicación estable desde `{ channel, to, accountId, threadId }`. El asistente
normaliza los ids de hilos numéricos de la misma manera que lo hace el núcleo, por lo que los complementos deben preferirlo
sobre las comparaciones `String(threadId)` ad hoc.
Los complementos con gramática de destino específica del proveedor pueden inyectar su analizador en
`resolveChannelRouteTargetWithParser(...)` y aún así obtener la misma forma de destino de ruta
y semánticas de reserva de hilo que usa el núcleo.

Los complementos agrupados que necesitan el mismo análisis antes de que se inicie el registro del canal
también pueden exponer un archivo `session-key-api.ts` de nivel superior con una exportación
`resolveSessionConversation(...)` coincidente. El núcleo usa esa superficie segura para el arranque
solo cuando el registro del complemento en tiempo de ejecución aún no está disponible.

`messaging.resolveParentConversationCandidates(...)` sigue disponible como
alternativa de compatibilidad heredada cuando un complemento solo necesita reservas principales encima
del id genérico/raw. Si ambos enlaces existen, el núcleo usa
`resolveSessionConversation(...).parentConversationCandidates` primero y solo
recurre a `resolveParentConversationCandidates(...)` cuando el enlace canónico
los omite.

## Aprobaciones y capacidades del canal

La mayoría de los complementos de canal no necesitan código específico de aprobaciones.

- El núcleo posee `/approve` del mismo chat, cargas útiles compartidas de botones de aprobación y entrega alternativa genérica.
- Prefiera un solo objeto `approvalCapability` en el complemento del canal cuando el canal necesite un comportamiento específico de aprobación.
- Se ha eliminado `ChannelPlugin.approvals`. Coloque los hechos de entrega, nativos, renderizado y autenticación de aprobaciones en `approvalCapability`.
- `plugin.auth` es solo para inicio/cierre de sesión; el núcleo ya no lee los enlaces de autenticación de aprobación de ese objeto.
- `approvalCapability.authorizeActorAction` y `approvalCapability.getActionAvailabilityState` son la interfaz canónica de autenticación de aprobaciones.
- Use `approvalCapability.getActionAvailabilityState` para la disponibilidad de autenticación de aprobaciones en el mismo chat.
- Si su canal expone aprobaciones de ejecución nativas, use `approvalCapability.getExecInitiatingSurfaceState` para el estado de la superficie iniciadora/cliente nativo cuando difiera de la autenticación de aprobación en el mismo chat. El núcleo usa ese enlace específico de ejecución para distinguir entre `enabled` y `disabled`, decidir si el canal iniciador admite aprobaciones de ejecución nativas e incluir el canal en la guía de contingencia del cliente nativo. `createApproverRestrictedNativeApprovalCapability(...)` completa esto para el caso común.
- Use `outbound.shouldSuppressLocalPayloadPrompt` o `outbound.beforeDeliverPayload` para el comportamiento del ciclo de vida de la carga útil específico del canal, como ocultar avisos de aprobación local duplicados o enviar indicadores de escritura antes de la entrega.
- Use `approvalCapability.delivery` solo para el enrutamiento de aprobaciones nativas o la supresión de la alternativa.
- Use `approvalCapability.nativeRuntime` para los hechos de aprobación nativos propiedad del canal. Manténgalo diferido en los puntos de entrada de canal activos con `createLazyChannelApprovalNativeRuntimeAdapter(...)`, que puede importar su módulo de tiempo de ejecución bajo demanda mientras aún permite al núcleo ensamblar el ciclo de vida de la aprobación.
- Use `approvalCapability.render` solo cuando un canal realmente necesite cargas útiles de aprobación personalizadas en lugar del renderizador compartido.
- Use `approvalCapability.describeExecApprovalSetup` cuando el canal quiera que la respuesta de ruta deshabilitada explique los ajustes de configuración exactos necesarios para habilitar las aprobaciones de ejecución nativas. El enlace recibe `{ channel, channelLabel, accountId }`; los canales de cuenta con nombre deben renderizar rutas con ámbito de cuenta como `channels.<channel>.accounts.<id>.execApprovals.*` en lugar de los valores predeterminados de nivel superior.
- Si un canal puede inferir identidades de MD estables similares a las del propietario a partir de la configuración existente, use `createResolvedApproverActionAuthAdapter` de `openclaw/plugin-sdk/approval-runtime` para restringir `/approve` del mismo chat sin añadir lógica central específica para aprobaciones.
- Si un canal necesita entrega de aprobaciones nativa, mantenga el código del canal enfocado en la normalización de objetivos más los hechos de transporte/presentación. Use `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver` y `createApproverRestrictedNativeApprovalCapability` de `openclaw/plugin-sdk/approval-runtime`. Coloque los hechos específicos del canal detrás de `approvalCapability.nativeRuntime`, idealmente a través de `createChannelApprovalNativeRuntimeAdapter(...)` o `createLazyChannelApprovalNativeRuntimeAdapter(...)`, para que el núcleo pueda ensamblar el controlador y gestionar el filtrado de solicitudes, enrutamiento, deduplicación, caducidad, suscripción a la puerta de enlace y avisos de enrutamiento a otro lugar. `nativeRuntime` se divide en algunas costuras más pequeñas:
- `createChannelNativeOriginTargetResolver` usa el comparador de rutas de canal compartido por defecto para los objetivos `{ to, accountId, threadId }`. Pase `targetsMatch` solo cuando un canal tenga reglas de equivalencia específicas del proveedor, como la coincidencia de prefijos de marca de tiempo de Slack.
- Pase `normalizeTargetForMatch` a `createChannelNativeOriginTargetResolver` cuando el canal necesite canonicalizar los ids del proveedor antes de que se ejecute el comparador de rutas predeterminado o una devolución de llamada `targetsMatch` personalizada, mientras se preserva el objetivo original para la entrega. Use `normalizeTarget` solo cuando el objetivo de entrega resuelto en sí deba ser canonicalizado.
- `availability` - si la cuenta está configurada y si se debe manejar una solicitud
- `presentation` - mapear el modelo de vista de aprobación compartida en cargas útiles nativas pendientes/resueltas/caducadas o acciones finales
- `transport` - preparar objetivos más enviar/actualizar/eliminar mensajes de aprobación nativos
- `interactions` - enlaces de vinculación/desvinculación/acción de borrado opcionales para botones nativos o reacciones, además de un enlace `cancelDelivered` opcional. Implemente `cancelDelivered` cuando `deliverPending` registre estado en proceso o persistente (como un almacén de objetivos de reacción) para que el estado pueda liberarse si una detención del controlador cancela la entrega antes de que se ejecute `bindPending` o cuando `bindPending` no devuelve ningún identificador
- `observe` - enlaces de diagnóstico de entrega opcionales
- Si el canal necesita objetos propiedad del tiempo de ejecución, como un cliente, un token, una aplicación Bolt o un receptor de webhooks, regístrelos a través de `openclaw/plugin-sdk/channel-runtime-context`. El registro genérico de contexto de tiempo de ejecución permite que el núcleo inicialice controladores impulsados por capacidades desde el estado de inicio del canal sin agregar pegamento de contenedor específico de aprobaciones.
- Recurre al `createChannelApprovalHandler` o `createChannelNativeApprovalRuntime` de nivel inferior solo cuando la costura impulsada por capacidades aún no es lo suficientemente expresiva.
- Los canales de aprobación nativos deben enrutar tanto `accountId` como `approvalKind` a través de esos auxiliares. `accountId` mantiene la política de aprobación de múltiples cuentas limitada a la cuenta de bot correcta, y `approvalKind` mantiene disponible el comportamiento de aprobación de ejecución frente a complemento para el canal sin ramificaciones codificadas en el núcleo.
- Core ahora también es propietario de los avisos de redirección de aprobaciones. Los complementos del canal no deben enviar sus propios mensajes de seguimiento de "aprobación fue a MDs / otro canal" desde `createChannelNativeApprovalRuntime`; en su lugar, exponga el origen exacto y el enrutamiento al DM del aprobador a través de los auxiliares de capacidad de aprobación compartidos y permita que Core agregue las entregas reales antes de publicar cualquier aviso de vuelta al chat iniciador.
- Conservar el tipo de id de aprobación entregado de extremo a extremo. Los clientes nativos no deben
  adivinar ni reescribir el enrutamiento de aprobación de ejecución frente a complemento desde el estado local del canal.
- Diferentes tipos de aprobación pueden exponer intencionalmente diferentes superficies nativas.
  Ejemplos empaquetados actuales:
  - Slack mantiene disponible el enrutamiento de aprobación nativo tanto para identificadores de ejecución como de complemento.
  - Matrix mantiene el mismo enrutamiento nativo de DM/canal y la experiencia de usuario de reacción para aprobaciones
    de ejecución y de complemento, mientras que aún permite que la autenticación difiera según el tipo de aprobación.
- `createApproverRestrictedNativeApprovalAdapter` todavía existe como un contenedor de compatibilidad, pero el código nuevo debería preferir el generador de capacidades y exponer `approvalCapability` en el complemento.

Para los puntos de entrada de canal activos, prefiera las subrutas de tiempo de ejecución más estrechas cuando solo
necesite una parte de esa familia:

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

De manera similar, prefiera `openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/reply-runtime`,
`openclaw/plugin-sdk/reply-dispatch-runtime`,
`openclaw/plugin-sdk/reply-reference` y
`openclaw/plugin-sdk/reply-chunking` cuando no necesite la superficie general
del paraguas.

Específicamente para la configuración:

- `openclaw/plugin-sdk/setup-runtime` cubre los auxiliares de configuración seguros en tiempo de ejecución:
  `createSetupTranslator`, adaptadores de parches de configuración seguros para importaciones (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), resultado de búsqueda de notas,
  `promptResolvedAllowFrom`, `splitSetupEntries` y los constructores
  de proxy de configuración delegados
- `openclaw/plugin-sdk/setup-runtime` incluye la costura del adaptador consciente del entorno para
  `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` cubre los constructores de configuración de instalación opcional
  además de algunos primitivos seguros de configuración:
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

Si su canal admite configuración o autenticación controlada por el entorno y los flujos genéricos de inicio/configuración deben conocer esos nombres de entorno antes de que se cargue el tiempo de ejecución, declárelos en el manifiesto del complemento con `channelEnvVars`. Mantenga `envVars` del tiempo de ejecución del canal o constantes locales solo para el texto orientado al operador.

Si su canal puede aparecer en `status`, `channels list`, `channels status` o análisis de SecretRef antes de que se inicie el tiempo de ejecución del complemento, agregue `openclaw.setupEntry` en `package.json`. Ese punto de entrada debe ser seguro para importar en rutas de comandos de solo lectura y debe devolver los metadatos del canal, el adaptador de configuración seguro para la configuración, el adaptador de estado y los metadatos del objetivo secreto del canal necesarios para esos resúmenes. No inicie clientes, escuchas o tiempos de ejecución de transporte desde el punto de entrada de configuración.

Mantenga también la ruta de importación de la entrada principal del canal estrecha. El descubrimiento puede evaluar la entrada y el módulo del complemento del canal para registrar capacidades sin activar el canal. Los archivos como `channel-plugin-api.ts` deben exportar el objeto del complemento del canal sin importar asistentes de configuración, clientes de transporte, escuchas de sockets, iniciadores de subprocesos o módulos de inicio de servicios. Coloque esas piezas de tiempo de ejecución en módulos cargados desde `registerFull(...)`, definidores de tiempo de ejecución o adaptadores de capacidad diferidos.

`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled` y
`splitSetupEntries`

- use la costura `openclaw/plugin-sdk/setup` más amplia solo cuando también necesite
  los asistentes de configuración/configuración compartidos más pesados, como
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si su canal solo quiere anunciar "instale este complemento primero" en las superficies de configuración, prefiera `createOptionalChannelSetupSurface(...)`. El adaptador/asistente generado falla cerrado en las escrituras y finalización de la configuración, y reutiliza el mismo mensaje de instalación requerida en la validación, finalización y copia del enlace de documentación.

Para otras rutas frecuentes del canal, prefiera los asistentes estrechos sobre las superficies heredadas más amplias:

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution` y
  `openclaw/plugin-sdk/account-helpers` para la configuración de varias cuentas
  y la reserva de cuenta predeterminada
- `openclaw/plugin-sdk/inbound-envelope` y
  `openclaw/plugin-sdk/inbound-reply-dispatch` para el cableado de ruta/sobre entrante
  y registro y despacho
- `openclaw/plugin-sdk/messaging-targets` para el análisis/ coincidencia de objetivos
- `openclaw/plugin-sdk/outbound-media` y
  `openclaw/plugin-sdk/outbound-runtime` para la carga de medios, además de los delegados
  de identidad/envío saliente y la planificación de carga útil
- `buildThreadAwareOutboundSessionRoute(...)` de
  `openclaw/plugin-sdk/channel-core` cuando una ruta de salida debe conservar un
  `replyToId`/`threadId` explícito o recuperar la sesión actual `:thread:`
  después de que la clave de sesión base aún coincida. Los complementos del proveedor pueden anular
  la precedencia, el comportamiento del sufijo y la normalización del ID del subproceso cuando su plataforma
  tiene semánticas de entrega de subprocesos nativos.
- `openclaw/plugin-sdk/thread-bindings-runtime` para el ciclo de vida de vinculación de subprocesos
  y el registro del adaptador
- `openclaw/plugin-sdk/agent-media-payload` solo cuando aún se requiere un diseño de campo de carga útil de agente/medios heredado
- `openclaw/plugin-sdk/telegram-command-config` para la normalización de comandos personalizados de Telegram,
  la validación de duplicados/conflictos y un contrato de configuración de comandos estable alternativo

Los canales solo de autenticación generalmente pueden detenerse en la ruta predeterminada: el núcleo maneja las aprobaciones y el complemento solo expone capacidades de salida/autenticación. Los canales de aprobación nativos como Matrix, Slack, Telegram y transportes de chat personalizados deberían usar los asistentes nativos compartidos en lugar de crear su propio ciclo de vida de aprobación.

## Política de mención entrante

Mantenga el manejo de menciones entrantes dividido en dos capas:

- recopilación de evidencia propiedad del complemento
- evaluación de políticas compartidas

Use `openclaw/plugin-sdk/channel-mention-gating` para decisiones sobre la política de menciones.
Use `openclaw/plugin-sdk/channel-inbound` solo cuando necesite el barril de ayuda de entrada más amplio.

Adecuado para la lógica local del complemento:

- detección de respuesta al bot
- detección de bot citado
- verificaciones de participación en hilos
- exclusiones de mensajes de servicio/sistema
- cachés nativos de la plataforma necesarios para probar la participación del bot

Adecuado para el asistente compartido:

- `requireMention`
- resultado de mención explícita
- lista de permitidos de mención implícita
- omisión de comando
- decisión final de omitir

Flujo preferido:

1. Calcule los datos locales de mención.
2. Pase esos datos a `resolveInboundMentionDecision({ facts, policy })`.
3. Use `decision.effectiveWasMentioned`, `decision.shouldBypassMention` y `decision.shouldSkip` en su puerta de enlace de entrada.

```typescript
import { implicitMentionKindWhen, matchesMentionWithExplicit, resolveInboundMentionDecision } from "openclaw/plugin-sdk/channel-inbound";

const mentionMatch = matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const facts = {
  canDetectMention: true,
  wasMentioned: mentionMatch.matched,
  hasAnyMention: mentionMatch.hasExplicitMention,
  implicitMentionKinds: [...implicitMentionKindWhen("reply_to_bot", isReplyToBot), ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot)],
};

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    allowedImplicitMentionKinds: requireExplicitMention ? [] : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`api.runtime.channel.mentions` expone los mismos ayudantes de mención compartidos para
los complementos de canal empaquetados que ya dependen de la inyección en tiempo de ejecución:

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

Si solo necesita `implicitMentionKindWhen` y
`resolveInboundMentionDecision`, impórtelos de
`openclaw/plugin-sdk/channel-mention-gating` para evitar cargar ayudantes de tiempo de ejecución de entrada no relacionados.

Use `resolveInboundMentionDecision({ facts, policy })` para la puerta de enlace de menciones.

## Tutorial

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Paquete y manifiesto">
    Cree los archivos de complementos estándar. El campo `channel` en `package.json` es
    lo que convierte a esto en un complemento de canal. Para conocer la superficie completa de metadatos del paquete,
    consulte [Configuración y configuración de complementos](/es/plugins/sdk-setup#openclaw-channel):

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "Connect OpenClaw to Acme Chat."
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "kind": "channel",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat channel plugin",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {}
      },
      "channelConfigs": {
        "acme-chat": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "uiHints": {
            "token": {
              "label": "Bot token",
              "sensitive": true
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

    `configSchema` valida `plugins.entries.acme-chat.config`. Úselo para
    configuraciones propiedad del complemento que no sean la configuración de la cuenta del canal. `channelConfigs`
    valida `channels.acme-chat` y es la fuente de ruta fría utilizada por el esquema de configuración,
    la configuración y las superficies de la interfaz de usuario antes de que se cargue el tiempo de ejecución del complemento.

  </Step>

  <Step title="Crear el objeto del complemento de canal">
    La interfaz `ChannelPlugin` tiene muchas superficies de adaptador opcionales. Comience con
    lo mínimo - `id` y `setup` - y añada adaptadores según los necesite.

    Cree `src/channel.ts`:

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // your platform API client

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: token is required");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        setup: {
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
      }),

      // DM security: who can message the bot
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // Pairing: approval flow for new DM contacts
      pairing: {
        text: {
          idLabel: "Acme Chat username",
          message: "Send this code to verify your identity:",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // Threading: how replies are delivered
      threading: { topLevelReplyToMode: "reply" },

      // Outbound: send messages to the platform
      outbound: {
        attachedResults: {
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    Para canales que aceptan tanto claves DM canónicas de nivel superior como claves anidadas heredadas, use los ayudantes de `plugin-sdk/channel-config-helpers`: `resolveChannelDmAccess`, `resolveChannelDmPolicy`, `resolveChannelDmAllowFrom` y `normalizeChannelDmPolicy` mantienen los valores locales de la cuenta antes que los valores raíz heredados. Empareje el mismo resolutor con la reparación del doctor a través de `normalizeLegacyDmAliases` para que el tiempo de ejecución y la migración lean el mismo contrato.

    <Accordion title="Qué hace createChatChannelPlugin por usted">
      En lugar de implementar manualmente interfaces de adaptador de bajo nivel, pasa
      opciones declarativas y el constructor las compone:

      | Opción | Lo que conecta |
      | --- | --- |
      | `security.dm` | Resolutor de seguridad DM con ámbito desde campos de configuración |
      | `pairing.text` | Flujo de emparejamiento DM basado en texto con intercambio de códigos |
      | `threading` | Resolutor de modo de respuesta (fijo, con ámbito de cuenta o personalizado) |
      | `outbound.attachedResults` | Funciones de envío que devuelven metadatos de resultado (ID de mensajes) |

      También puede pasar objetos de adaptador sin procesar en lugar de las opciones declarativas
      si necesita control total.

      Los adaptadores de salida sin procesar pueden definir una función `chunker(text, limit, ctx)`.
      El `ctx.formatting` opcional lleva decisiones de formato en el momento de la entrega
      como `maxLinesPerMessage`; aplíquelo antes de enviar para que el hilado de respuestas
      y los límites de los fragmentos se resuelvan una vez mediante la entrega de salida compartida.
      Los contextos de envío también incluyen `replyToIdSource` (`implicit` o `explicit`)
      cuando se resolvió un objetivo de respuesta nativo, por lo que los ayudantes de carga útil pueden preservar
      las etiquetas de respuesta explícitas sin consumir un espacio de respuesta implícito de un solo uso.
    </Accordion>

  </Step>

  <Step title="Conectar el punto de entrada">
    Cree `index.ts`:

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat channel plugin",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat management",
                hasSubcommands: false,
              },
            ],
          },
        );
      },
      registerFull(api) {
        api.registerGatewayMethod(/* ... */);
      },
    });
    ```

    Coloque los descriptores de CLI propiedad del canal en `registerCliMetadata(...)` para que OpenClaw
    pueda mostrarlos en la ayuda raíz sin activar el tiempo de ejecución completo del canal,
    mientras que las cargas completas normales todavía recogen los mismos descriptores para el registro real
    de comandos. Mantenga `registerFull(...)` para el trabajo exclusivo del tiempo de ejecución.
    Si `registerFull(...)` registra métodos RPC de puerta de enlace, utilice un
    prefijo específico del complemento. Los espacios de nombres de administración principales (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre
    resuelven a `operator.admin`.
    `defineChannelPluginEntry` maneja la división del modo de registro automáticamente. Consulte
    [Puntos de entrada](/es/plugins/sdk-entrypoints#definechannelpluginentry) para todas
    las opciones.

  </Step>

  <Step title="Agregar una entrada de configuración">
    Cree `setup-entry.ts` para la carga ligera durante la incorporación:

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw carga esto en lugar de la entrada completa cuando el canal está deshabilitado
    o sin configurar. Evita extraer código pesado de tiempo de ejecución durante los flujos de configuración.
    Consulte [Configuración y ajuste](/es/plugins/sdk-setup#setup-entry) para obtener más detalles.

    Los canales del espacio de trabajo empaquetados que dividen las exportaciones seguras para la configuración en módulos
    auxiliares pueden usar `defineBundledChannelSetupEntry(...)` de
    `openclaw/plugin-sdk/channel-entry-contract` cuando también necesitan un
    definidor explícito de tiempo de ejecución en el momento de la configuración.

  </Step>

  <Step title="Manejar mensajes entrantes">
    Su complemento necesita recibir mensajes de la plataforma y reenviarlos a
    OpenClaw. El patrón típico es un webhook que verifica la solicitud y
    la despacha a través del controlador de entrada de su canal:

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK -
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      El manejo de mensajes entrantes es específico del canal. Cada complemento de canal posee
      su propia canalización de entrada. Mire los complementos de canal empaquetados
      (por ejemplo, el paquete de complementos de Microsoft Teams o Google Chat) para ver patrones reales.
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Probar">
Escriba pruebas colocalizadas en `src/channel.test.ts`:

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("resolves account from config", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- <bundled-plugin-root>/acme-chat/
    ```

    Para obtener ayudantes de pruebas compartidos, consulte [Pruebas](/es/plugins/sdk-testing).

</Step>
</Steps>

## Estructura de archivos

```
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel metadata
├── openclaw.plugin.json      # Manifest with config schema
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # Public exports (optional)
├── runtime-api.ts            # Internal runtime exports (optional)
└── src/
    ├── channel.ts            # ChannelPlugin via createChatChannelPlugin
    ├── channel.test.ts       # Tests
    ├── client.ts             # Platform API client
    └── runtime.ts            # Runtime store (if needed)
```

## Temas avanzados

<CardGroup cols={2}>
  <Card title="Opciones de hilos" icon="git-branch" href="/es/plugins/sdk-entrypoints#registration-mode">
    Modos de respuesta fijos, con ámbito de cuenta o personalizados
  </Card>
  <Card title="Integración de herramientas de mensajes" icon="puzzle" href="/es/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool y descubrimiento de acciones
  </Card>
  <Card title="Resolución de objetivos" icon="crosshair" href="/es/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Asistentes de ejecución" icon="settings" href="/es/plugins/sdk-runtime">
    TTS, STT, medios, subagente a través de api.runtime
  </Card>
  <Card title="Núcleo de turno de canal" icon="bolt" href="/es/plugins/sdk-channel-turn">
    Ciclo de vida de eventos entrantes compartidos: ingerir, resolver, registrar, enviar, finalizar
  </Card>
</CardGroup>

<Note>Algunas costuras de asistentes empaquetados aún existen para el mantenimiento y la compatibilidad de los complementos empaquetados. No son el patrón recomendado para nuevos complementos de canal; prefiera las subrutas genéricas channel/setup/reply/runtime de la superficie común del SDK a menos que esté manteniendo directamente esa familia de complementos empaquetados.</Note>

## Próximos pasos

- [Complementos de proveedor](/es/plugins/sdk-provider-plugins) - si su complemento también proporciona modelos
- [Descripción general del SDK](/es/plugins/sdk-overview) - referencia completa de importaciones de subrutas
- [Pruebas del SDK](/es/plugins/sdk-testing) - utilidades de prueba y pruebas de contrato
- [Manifiesto de complementos](/es/plugins/manifest) - esquema completo del manifiesto

## Relacionado

- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Crear complementos](/es/plugins/building-plugins)
- [Complementos de arnés de agente](/es/plugins/sdk-agent-harness)
