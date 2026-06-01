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

<Info>Si no has construido ningún plugin de OpenClaw antes, lee primero [Introducción](/es/plugins/building-plugins) para obtener la estructura básica del paquete y la configuración del manifiesto.</Info>

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
`defineChannelMessageAdapter` de `openclaw/plugin-sdk/channel-outbound`. El
adaptador declara qué capacidades de envío final duraderas son compatibles realmente
con el transporte nativo y dirige los envíos de texto/medios a las mismas funciones de
transporte que el adaptador `outbound` heredado. Solo declare una capacidad cuando una prueba de contrato
demuestre el efecto secundario nativo y el recibo devuelto.
Para ver el contrato completo de la API, ejemplos, matriz de capacidades, reglas de recibo, finalización
en vivo de la vista previa, política de recepción de ack, pruebas y tabla de migración, consulte
[Channel outbound API](/es/plugins/sdk-channel-outbound).
Si el adaptador `outbound` existente ya tiene los métodos de envío correctos y
metadatos de capacidad, use `createChannelMessageAdapterFromOutbound(...)` para
derivar el adaptador `message` en lugar de escribir manualmente otro puente.
Los envíos del adaptador deben devolver valores `MessageReceipt`. Cuando el código de compatibilidad
aún necesita identificadores heredados, derívelos con `listMessageReceiptPlatformIds(...)`
o `resolveMessageReceiptPrimaryId(...)` en lugar de mantener campos paralelos
`messageIds` en el nuevo código del ciclo de vida.
Los canales con capacidad de vista previa también deben declarar `message.live.capabilities` con
el ciclo de vida en vivo exacto que poseen, como `draftPreview`,
`previewFinalization`, `progressUpdates`, `nativeStreaming`, o
`quietFinalization`. Los canales que finalizan una vista previa de borrador en su lugar también
deberían declarar `message.live.finalizer.capabilities`, como `finalEdit`,
`normalFallback`, `discardPending`, `previewReceipt` y
`retainOnAmbiguousFailure`, y dirigir la lógica en tiempo de ejecución a través de
`defineFinalizableLivePreviewAdapter(...)` más
`deliverWithFinalizableLivePreviewAdapter(...)`. Mantenga esas capacidades respaldadas
por pruebas `verifyChannelMessageLiveCapabilityAdapterProofs(...)` y
`verifyChannelMessageLiveFinalizerProofs(...)` para que el comportamiento de vista previa nativa,
progreso, edición, alternativa/retención, limpieza y recibo no pueda derivar
silenciosamente.
Los receptores de entrada que difieren los reconocimientos de la plataforma deben declarar
`message.receive.defaultAckPolicy` y `supportedAckPolicies` en lugar de ocultar
el tiempo de ack en el estado local del monitor. Cubra cada política declarada con
`verifyChannelMessageReceiveAckPolicyAdapterProofs(...)`.

Los asistentes de respuesta heredados como `createChannelTurnReplyPipeline`,
`dispatchInboundReplyWithBase` y `recordInboundSessionAndDispatchReply`
permanecen disponibles para los despachadores de compatibilidad. No use esos nombres para el nuevo
código de canal; los nuevos complementos deben comenzar con el adaptador `message`, recibos y
asistentes del ciclo de vida de recepción/envío en `openclaw/plugin-sdk/channel-outbound`.

Los canales que migren la autorización de entrada pueden usar la subruta experimental
`openclaw/plugin-sdk/channel-ingress-runtime` desde las rutas de recepción en tiempo de ejecución.
La subruta mantiene la búsqueda de la plataforma y los efectos secundarios en el complemento, mientras que
comparte la resolución del estado de la lista de permitidos, las decisiones de ruta/remitente/comando/evento/activación,
diagnósticos redactados y el mapeo de admisión de turnos. Mantenga la normalización de la identidad del complemento en el descriptor que pasa al solucionador; no
serialice los valores de coincidencia brutos del estado resuelto o de la decisión. Consulte
[Channel ingress API](/es/plugins/sdk-channel-ingress) para ver el diseño de la API,
el límite de propiedad y las expectativas de prueba.

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

Use `openclaw/plugin-sdk/channel-route` cuando el código del complemento necesita normalizar
campos tipo ruta, comparar un hilo secundario con su ruta principal, o construir una
clave de deduplicación estable a partir de `{ channel, to, accountId, threadId }`. El asistente
normaliza los identificadores numéricos de hilo de la misma manera que lo hace el núcleo, por lo que los complementos deben preferirlo
sobre comparaciones `String(threadId)` ad hoc.
Los complementos con gramática de destino específica del proveedor deben exponer
`messaging.resolveOutboundSessionRoute(...)` para que el núcleo obtenga la identidad de
sesión e hilo nativa del proveedor sin usar shims del analizador.

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
- Si la autenticación de aprobación personalizada permite intencionalmente solo el retorno al mismo chat, devuelva `markImplicitSameChatApprovalAuthorization({ authorized: true })` desde `openclaw/plugin-sdk/approval-auth-runtime`; de lo contrario, el núcleo trata el resultado como autorización explícita del aprobador.
- Si una devolución de llamada nativa propiedad del canal resuelve las aprobaciones directamente, use `isImplicitSameChatApprovalAuthorization(...)` antes de resolver para que el retorno implícito aún pase por la autorización normal de actores del canal.
- Si un canal necesita entrega de aprobación nativa, mantenga el código del canal enfocado en la normalización de objetivos más los hechos de transporte/presentación. Use `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver` y `createApproverRestrictedNativeApprovalCapability` de `openclaw/plugin-sdk/approval-runtime`. Coloque los hechos específicos del canal detrás de `approvalCapability.nativeRuntime`, idealmente a través de `createChannelApprovalNativeRuntimeAdapter(...)` o `createLazyChannelApprovalNativeRuntimeAdapter(...)`, para que el núcleo pueda ensamblar el controlador y poseer el filtrado de solicitudes, enrutamiento, deduplicación, vencimiento, suscripción a la puerta de enlace y notificaciones de enrutamiento a otro lugar. `nativeRuntime` se divide en algunas costuras más pequeñas:
- `createChannelNativeOriginTargetResolver` usa el comparador compartido de canal-ruta por defecto para objetivos `{ to, accountId, threadId }`. Pase `targetsMatch` solo cuando un canal tenga reglas de equivalencia específicas del proveedor, como la coincidencia de prefijo de marca de tiempo de Slack.
- Pase `normalizeTargetForMatch` a `createChannelNativeOriginTargetResolver` cuando el canal necesite canonalizar los IDs del proveedor antes de que se ejecute el comparador de ruta predeterminado o una devolución de llamada `targetsMatch` personalizada, mientras se preserva el objetivo original para la entrega. Use `normalizeTarget` solo cuando el propio objetivo de entrega resuelto deba ser canonalizado.
- `availability` - si la cuenta está configurada y si se debe manejar una solicitud
- `presentation` - mapear el modelo de vista de aprobación compartido en cargas útiles nativas pendientes/resueltas/expiradas o acciones finales
- `transport` - preparar objetivos más enviar/actualizar/eliminar mensajes de aprobación nativos
- `interactions` - hooks opcionales de bind/unbind/clear-action para botones nativos o reacciones, más un hook `cancelDelivered` opcional. Implemente `cancelDelivered` cuando `deliverPending` registre estado en proceso o persistente (como un almacén de objetivos de reacción) para que el estado pueda liberarse si una parada del controlador cancela la entrega antes de que se ejecute `bindPending` o cuando `bindPending` devuelve ningún identificador
- `observe` - hooks opcionales de diagnósticos de entrega
- Si el canal necesita objetos propiedad del runtime como un cliente, un token, una aplicación Bolt o un receptor de webhooks, regístrelos a través de `openclaw/plugin-sdk/channel-runtime-context`. El registro genérico de contexto de runtime permite que el núcleo inicialice controladores impulsados por capacidades desde el estado de inicio del canal sin agregar pegamento específico de aprobación.
- Recurra a `createChannelApprovalHandler` o `createChannelNativeApprovalRuntime` de menor nivel solo cuando la costura impulsada por capacidades aún no sea lo suficientemente expresiva.
- Los canales de aprobación nativos deben enrutar tanto `accountId` como `approvalKind` a través de esos ayudantes. `accountId` mantiene la política de aprobación de múltiples cuentas limitada a la cuenta de bot correcta, y `approvalKind` mantiene el comportamiento de aprobación de exec vs. plugin disponible para el canal sin ramificaciones codificadas en el núcleo.
- Ahora Core también gestiona los avisos de reenvío de aprobaciones. Los complementos de canal no deben enviar sus propios mensajes de seguimiento de "la aprobación pasó a los MD / otro canal" desde `createChannelNativeApprovalRuntime`; en su lugar, expongan el origen exacto y el enrutamiento por DM del aprobador a través de los asistentes de capacidad de aprobación compartidos y dejen que Core agregue las entregas reales antes de publicar cualquier aviso de vuelta al chat iniciador.
- Conservar el tipo de identificación de aprobación entregada de extremo a extremo. Los clientes nativos no deben
  adivinar ni reescribir el enrutamiento de aprobaciones ejec vs. complemento basándose en el estado local del canal.
- Diferentes tipos de aprobaciones pueden exponer intencionalmente diferentes superficies nativas.
  Ejemplos incluidos actualmente:
  - Slack mantiene disponible el enrutamiento de aprobaciones nativo tanto para los IDs ejec como para los de complemento.
  - Matrix mantiene el mismo enrutamiento nativo de DM/canal y la experiencia de usuario de reacción para las aprobaciones
    ejec y de complemento, a la vez que permite que la autenticación difiera según el tipo de aprobación.
- `createApproverRestrictedNativeApprovalAdapter` todavía existe como un contenedor de compatibilidad, pero el código nuevo debe preferir el constructor de capacidades y exponer `approvalCapability` en el complemento.

Para los puntos de entrada de canal en tiempo real, prefiere las subrutas de tiempo de ejecución más específicas cuando solo necesites una parte de esa familia:

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

Del mismo modo, prefiere `openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/reply-runtime`,
`openclaw/plugin-sdk/reply-dispatch-runtime`,
`openclaw/plugin-sdk/reply-reference` y
`openclaw/plugin-sdk/reply-chunking` cuando no necesites la superficie general más amplia.

Específicamente para la configuración:

- `openclaw/plugin-sdk/setup-runtime` cubre los asistentes de configuración seguros en tiempo de ejecución:
  `createSetupTranslator`, adaptadores de parches de configuración seguros de importación (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), salida de nota de búsqueda,
  `promptResolvedAllowFrom`, `splitSetupEntries` y los constructores
  de proxy de configuración delegados
- `openclaw/plugin-sdk/setup-runtime` incluye la costura del adaptador consciente del entorno para
  `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` cubre los constructores de configuración de instalación opcional
  además de algunos primitivos seguros de configuración:
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

Si su canal admite configuración o autenticación impulsada por entorno y los flujos genéricos de inicio/configuración deben conocer esos nombres de entorno antes de que se cargue el tiempo de ejecución, declárelos en el manifiesto del complemento con `channelEnvVars`. Mantenga el tiempo de ejecución del canal `envVars` o constantes locales solo para el texto orientado al operador.

Si su canal puede aparecer en `status`, `channels list`, `channels status` o escaneos SecretRef antes de que se inicie el tiempo de ejecución del complemento, agregue `openclaw.setupEntry` en `package.json`. Ese punto de entrada debe ser seguro de importar en rutas de comandos de solo lectura y debe devolver los metadatos del canal, el adaptador de configuración seguro para la configuración, el adaptador de estado y los metadatos del objetivo secreto del canal necesarios para esos resúmenes. No inicie clientes, oyentes o tiempos de ejecución de transporte desde el punto de entrada de configuración.

Mantén la ruta de importación de la entrada principal del canal también estrecha. El descubrimiento puede evaluar la entrada y el módulo del complemento del canal para registrar capacidades sin activar el canal. Los archivos como `channel-plugin-api.ts` deben exportar el objeto del complemento del canal sin importar asistentes de configuración, clientes de transporte, escuchas de socket, lanzadores de subprocesos o módulos de inicio de servicio. Coloca esas piezas en tiempo de ejecución en módulos cargados desde `registerFull(...)`, establecedores en tiempo de ejecución o adaptadores de capacidad diferidos.

`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, y
`splitSetupEntries`

- use la `openclaw/plugin-sdk/setup` seam más amplia solo cuando también necesite
  las ayudantes de configuración/compartidos más pesados como
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si su canal solo quiere anunciar "instale este complemento primero" en las superficies de
configuración, prefiera `createOptionalChannelSetupSurface(...)`. El adaptador/asistente generado
falla cerrado en la escritura y finalización de la configuración, y reutilizan
el mismo mensaje de instalación requerida en la validación, finalización y copia del enlace de documentos.

Para otras rutas activas del canal, prefiera las ayudantes estrechas sobre las superficies heredadas
más amplias:

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution`, y
  `openclaw/plugin-sdk/account-helpers` para configuración de múltiples cuentas
  y respaldo a la cuenta predeterminada
- `openclaw/plugin-sdk/inbound-envelope` y
  `openclaw/plugin-sdk/channel-inbound` para el cableado de ruta/sobre entrante
  y registro y despacho
- `openclaw/plugin-sdk/channel-targets` para ayudantes de análisis de objetivos
- `openclaw/plugin-sdk/outbound-media` para la carga de medios y
  `openclaw/plugin-sdk/channel-outbound` para delegados de identidad/envío saliente
  y planificación de carga útil
- `buildThreadAwareOutboundSessionRoute(...)` de
  `openclaw/plugin-sdk/channel-core` cuando una ruta saliente debe preservar una
  `replyToId`/`threadId` explícita o recuperar la sesión `:thread:` actual
  después de que la clave de sesión base aún coincida. Los complementos del proveedor pueden anular
  la precedencia, el comportamiento del sufijo y la normalización del ID del hilo cuando su plataforma
  tiene semánticas de entrega de hilos nativas.
- `openclaw/plugin-sdk/thread-bindings-runtime` para el ciclo de vida de enlace de hilos
  y registro de adaptadores
- `openclaw/plugin-sdk/agent-media-payload` solo cuando aún se requiere un diseño de campo de carga útil
  de agente/medios heredado
- `openclaw/plugin-sdk/telegram-command-config` para la normalización de comandos personalizados de
  Telegram, validación de duplicados/conflictos y un contrato de configuración de comandos
  estable de respaldo

Los canales solo de autenticación generalmente pueden detenerse en la ruta predeterminada: el núcleo maneja las aprobaciones y el complemento simplemente expone capacidades de autenticación/salida. Los canales de aprobación nativos como Matrix, Slack, Telegram y transportes de chat personalizados deben usar las ayudantes nativas compartidas en lugar de crear su propio ciclo de vida de aprobación.

## Política de mención entrante

Mantenga el manejo de menciones entrantes dividido en dos capas:

- recopilación de evidencia propiedad del complemento
- evaluación de política compartida

Use `openclaw/plugin-sdk/channel-mention-gating` para decisiones de políticas de mención.
Use `openclaw/plugin-sdk/channel-inbound` solo cuando necesite el asistente de entrada
inbound más amplio.

Adecuado para lógica local del complemento:

- detección de respuesta al bot
- detección de bot citado
- verificaciones de participación en hilos
- exclusiones de mensajes de servicio/sistema
- cachés nativos de la plataforma necesarios para probar la participación del bot

Adecuado para el asistente compartido:

- `requireMention`
- resultado de mención explícita
- lista de permitidos de mención implícita
- omisión de comandos
- decisión final de omitir

Flujo preferido:

1. Calcule los datos locales de la mención.
2. Pase esos datos a `resolveInboundMentionDecision({ facts, policy })`.
3. Use `decision.effectiveWasMentioned`, `decision.shouldBypassMention` y `decision.shouldSkip` en su puerta de entrada inbound.

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

`api.runtime.channel.mentions` expone los mismos asistentes de mención compartidos para
los complementos de canal empaquetados que ya dependen de la inyección en tiempo de ejecución:

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

Si solo necesita `implicitMentionKindWhen` y
`resolveInboundMentionDecision`, impórtelos desde
`openclaw/plugin-sdk/channel-mention-gating` para evitar cargar asistentes de tiempo de ejecución
inbound no relacionados.

Use `resolveInboundMentionDecision({ facts, policy })` para el filtrado de menciones.

## Tutorial

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Paquete y manifiesto">
    Cree los archivos estándar del complemento. El campo `channel` en `package.json` es
    lo que convierte a esto en un complemento de canal. Para obtener la superficie completa de metadatos del paquete,
    consulte [Configuración y complementos](/es/plugins/sdk-setup#openclaw-channel):

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
    configuraciones propiedad del complemento que no son la configuración de la cuenta del canal. `channelConfigs`
    valida `channels.acme-chat` y es el origen de ruta fría utilizado por el esquema de configuración,
    la configuración y las superficies de la interfaz de usuario antes de que se cargue el tiempo de ejecución del complemento.

  </Step>

  <Step title="Construir el objeto del complemento de canal">
    La interfaz `ChannelPlugin` tiene muchas superficies de adaptador opcionales. Comience con
    el mínimo - `id` y `setup` - y agregue adaptadores según los necesite.

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

    Para canales que aceptan tanto claves DM canónicas de nivel superior como claves anidadas heredadas, use los ayudantes de `plugin-sdk/channel-config-helpers`: `resolveChannelDmAccess`, `resolveChannelDmPolicy`, `resolveChannelDmAllowFrom` y `normalizeChannelDmPolicy` mantienen los valores locales de la cuenta por delante de los valores raíz heredados. Empareje el mismo solucionador con la reparación del médico a través de `normalizeLegacyDmAliases` para que el tiempo de ejecución y la migración lean el mismo contrato.

    <Accordion title="Lo que hace createChatChannelPlugin por usted">
      En lugar de implementar interfaces de adaptador de bajo nivel manualmente, usted pasa
      opciones declarativas y el constructor las compone:

      | Opción | Lo que conecta |
      | --- | --- |
      | `security.dm` | Solucionador de seguridad DM con ámbito desde campos de configuración |
      | `pairing.text` | Flujo de emparejamiento DM basado en texto con intercambio de códigos |
      | `threading` | Solucionador de modo de respuesta (fijo, con ámbito de cuenta o personalizado) |
      | `outbound.attachedResults` | Funciones de envío que devuelven metadatos de resultado (ID de mensajes) |

      También puede pasar objetos de adaptador sin procesar en lugar de las opciones declarativas
      si necesita control total.

      Los adaptadores de salida sin procesar pueden definir una función `chunker(text, limit, ctx)`.
      El opcional `ctx.formatting` lleva decisiones de formato en el momento de entrega
      como `maxLinesPerMessage`; aplíquelo antes de enviar para que los hilos de respuesta
      y los límites de los fragmentos se resuelvan una sola vez mediante la entrega de salida compartida.
      Los contextos de envío también incluyen `replyToIdSource` (`implicit` o `explicit`)
      cuando se resolvió un objetivo de respuesta nativo, por lo que los ayudantes de carga útil pueden preservar
      etiquetas de respuesta explícitas sin consumir un espacio de respuesta implícito de un solo uso.
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
    mientras que las cargas completas normales aún recogen los mismos descriptores para el registro
    real de comandos. Mantenga `registerFull(...)` para el trabajo exclusivo del tiempo de ejecución.
    Si `registerFull(...)` registra métodos RPC de puerta de enlace, utilice un
    prefijo específico del complemento. Los espacios de nombres de administración principal (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre
    resuelven a `operator.admin`.
    `defineChannelPluginEntry` maneja la división del modo de registro automáticamente. Consulte
    [Puntos de entrada](/es/plugins/sdk-entrypoints#definechannelpluginentry) para todas
    las opciones.

  </Step>

  <Step title="Agregar una entrada de configuración">
    Cree `setup-entry.ts` para una carga ligera durante la incorporación:

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw carga esto en lugar de la entrada completa cuando el canal está deshabilitado
    o sin configurar. Evita cargar código de tiempo de ejecución pesado durante los flujos de configuración.
    Consulte [Configuración y configuración](/es/plugins/sdk-setup#setup-entry) para obtener más detalles.

    Los canales de espacio de trabajo empaquetados que dividen las exportaciones seguras para la configuración en módulos
    complementarios pueden usar `defineBundledChannelSetupEntry(...)` de
    `openclaw/plugin-sdk/channel-entry-contract` cuando también necesitan un
    definidor explícito de tiempo de ejecución en la configuración.

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
<Step title="Test">
Escribe pruebas colocalizadas en `src/channel.test.ts`:

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

    Para ver los asistentes de pruebas compartidos, consulta [Pruebas](/es/plugins/sdk-testing).

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
    Modos de respuesta fijos, con alcance de cuenta o personalizados
  </Card>
  <Card title="Integración de herramientas de mensajes" icon="puzzle" href="/es/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool y descubrimiento de acciones
  </Card>
  <Card title="Resolución de objetivos" icon="crosshair" href="/es/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Asistentes de tiempo de ejecución" icon="settings" href="/es/plugins/sdk-runtime">
    TTS, STT, medios, subagente mediante api.runtime
  </Card>
  <Card title="API de entrada del canal" icon="bolt" href="/es/plugins/sdk-channel-inbound">
    Ciclo de vida de eventos de entrada compartido: ingest, resolve, record, dispatch, finalize
  </Card>
</CardGroup>

<Note>Todavía existen algunas costuras de asistentes incluidos para el mantenimiento y la compatibilidad de los complementos incluidos. No son el patrón recomendado para los nuevos complementos de canal; prefiere las subrutas genéricas channel/setup/reply/runtime de la superficie común del SDK a menos que mantengas directamente esa familia de complementos incluidos.</Note>

## Próximos pasos

- [Complementos de proveedores](/es/plugins/sdk-provider-plugins): si tu complemento también proporciona modelos
- [Descripción general del SDK](/es/plugins/sdk-overview): referencia completa de importación de subrutas
- [Pruebas del SDK](/es/plugins/sdk-testing): utilidades de prueba y pruebas de contrato
- [Manifiesto del complemento](/es/plugins/manifest): esquema completo del manifiesto

## Relacionado

- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Creación de complementos](/es/plugins/building-plugins)
- [Complementos de arnés de agentes](/es/plugins/sdk-agent-harness)
