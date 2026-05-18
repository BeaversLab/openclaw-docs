---
summary: "Plan de diseño para el ciclo de vida unificado de recepción, envío, vista previa, edición y transmisión de mensajes duraderos"
read_when:
  - Refactoring channel send or receive behavior
  - Changing channel turn, reply dispatch, outbound queue, preview streaming, or plugin SDK message APIs
  - Designing a new channel plugin that needs durable sends, receipts, previews, edits, or retries
title: "Refactorización del ciclo de vida del mensaje"
---

Esta página es el diseño de destino para reemplazar los auxiliares dispersos de turno de canal, despacho de respuesta, transmisión de vista previa y entrega de salida con un ciclo de vida de mensaje duradero.

La versión corta:

- Los primitivos principales deben ser **recibir** y **enviar**, no **responder**.
- Una respuesta es solo una relación en un mensaje saliente.
- Un turno es una conveniencia de procesamiento de entrada, no el propietario de la entrega.
- El envío debe basarse en el contexto: `begin`, renderizar, vista previa o transmisión, envío final, confirmar, fallar.
- La recepción también debe basarse en el contexto: normalizar, deduplicar, enrutar, registrar, despachar, acuse de recibo de la plataforma, fallar.
- El SDK público del complemento debe reducirse a una pequeña superficie de mensajes de canal.

## Problemas

La pila de canales actual creció a partir de varias necesidades locales válidas:

- Los adaptadores de entrada simples usan `runtime.channel.turn.run`.
- Los adaptadores enriquecidos usan `runtime.channel.turn.runPrepared`.
- Los auxiliares heredados usan `dispatchInboundReplyWithBase`, `recordInboundSessionAndDispatchReply`, auxiliares de carga útil de respuesta, fragmentación de respuesta, referencias de respuesta y auxiliares de tiempo de ejecución de salida.
- La transmisión de vista previa reside en despachadores específicos del canal.
- Se está agregando durabilidad de entrega final alrededor de las rutas de carga útil de respuesta existentes.

Esa forma soluciona errores locales, pero deja a OpenClaw con demasiados conceptos públicos y demasiados lugares donde los significados de entrega pueden derivar.

El problema de confiabilidad que expuso esto es:

```text
Telegram polling update acked
  -> assistant final text exists
  -> process restarts before sendMessage succeeds
  -> final response is lost
```

El invariante objetivo es más amplio que Telegram: una vez que el núcleo decide que debe existir un mensaje saliente visible, la intención debe ser duradera antes de intentar el envío de la plataforma, y el recibo de la plataforma debe confirmarse después del éxito. Eso otorga a OpenClaw una recuperación al menos una vez. El comportamiento de exactamente una vez existe solo para adaptadores que pueden probar la idempotencia nativa o conciliar un intento desconocido después del envío contra el estado de la plataforma antes de repetir.

Ese es el estado final de esta refactorización, no una descripción de cada ruta actual. Durante la migración, los asistentes de salida existentes aún pueden recurrir a un envío directo cuando fallan las escrituras de cola de mejor esfuerzo. La refactorización solo se completa cuando los envíos finales durables fallan de forma cerrada o se excluyen explícitamente con una política no duradera documentada.

## Objetivos

- Un ciclo de vida central para todas las rutas de recepción y envío de mensajes del canal.
- Envíos finales durables por defecto en el nuevo ciclo de vida del mensaje después de que un adaptador declara un comportamiento seguro para repetición.
- Semánticas compartidas de vista previa, edición, flujo, finalización, reintento, recuperación y confirmación de recibo.
- Una pequeña superficie del SDK de complementos que los complementos de terceros puedan aprender y mantener.
- Compatibilidad para los llamadores de `channel.turn` existentes durante la migración.
- Puntos de extensión claros para nuevas capacidades del canal.
- Sin ramas específicas de la plataforma en el núcleo.
- Sin mensajes de canal de delta de token. La transmisión del canal permanece como vista previa de mensaje, edición, anexo o entrega de bloque completado.
- Metadatos estructurados de origen OpenClaw para la salida operacional/sistémica, de modo que las fallas visibles de la puerta de enlace no reingresen a las salas compartidas habilitadas para bots como indicaciones nuevas.

## No objetivos

- No eliminar `runtime.channel.turn.*` en la primera fase.
- No forzar a cada canal al mismo comportamiento de transporte nativo.
- No enseñar al núcleo temas de Telegram, transmisiones nativas de Slack, redacciones de Matrix, tarjetas de Feishu, voz de QQ o actividades de Teams.
- No publicar todos los asistentes de migración internos como API de SDK estable.
- No hacer que los reintentos reproduzcan operaciones de plataforma completadas no idempotentes.

## Modelo de referencia

Vercel Chat tiene un buen modelo mental público:

- `Chat`
- `Thread`
- `Channel`
- `Message`
- métodos de adaptador como `postMessage`, `editMessage`, `deleteMessage`, `stream`, `startTyping` y recuperaciones de historial
- un adaptador de estado para deduplicación, bloqueos, colas y persistencia

OpenClaw debe tomar prestado el vocabulario, no copiar la superficie.

Lo que OpenClaw necesita más allá de ese modelo:

- Intenciones de envío de salida durables antes de las llamadas de transporte directo.
- Contextos de envío explícitos con inicio, confirmación y falla.
- Contextos de recepción que conocen la política de confirmación de recibo de la plataforma.
- Los recibos que sobreviven al reinicio y pueden impulsar ediciones, eliminaciones, recuperaciones y
  supresión de duplicados.
- Un SDK público más pequeño. Los complementos agrupados pueden usar asistentes de tiempo de ejecución internos, pero
  los complementos de terceros deben ver una única API de mensajes coherente.
- Comportamiento específico del agente: sesiones, transcripciones, streaming en bloques, progreso
  de herramientas, aprobaciones, directivas de medios, respuestas silenciosas e historial de
  menciones grupales.

Las promesas de estilo `thread.post()` no son suficientes para OpenClaw. Ocultan el
límite de la transacción que decide si un envío es recuperable.

## Modelo central

El nuevo dominio debe vivir bajo un espacio de nombres central interno como
`src/channels/message/*`.

Tiene cuatro conceptos:

```typescript
core.messages.receive(...)
core.messages.send(...)
core.messages.live(...)
core.messages.state(...)
```

`receive` posee el ciclo de vida entrante.

`send` posee el ciclo de vida saliente.

`live` posee el estado de vista previa, edición, progreso y flujo.

`state` posee el almacenamiento de intención duradera, recibos, idempotencia, recuperación, bloqueos y
deduplicación.

## Términos de mensaje

### Mensaje

Un mensaje normalizado es neutro a la plataforma:

```typescript
type ChannelMessage = {
  id: string;
  channel: string;
  accountId?: string;
  direction: "inbound" | "outbound";
  target: MessageTarget;
  sender?: MessageActor;
  body?: MessageBody;
  attachments?: MessageAttachment[];
  relation?: MessageRelation;
  origin?: MessageOrigin;
  timestamp?: number;
  raw?: unknown;
};
```

### Objetivo

El objetivo describe dónde vive el mensaje:

```typescript
type MessageTarget = {
  kind: "direct" | "group" | "channel" | "thread";
  id: string;
  label?: string;
  spaceId?: string;
  parentId?: string;
  threadId?: string;
  nativeChannelId?: string;
};
```

### Relación

La respuesta es una relación, no una raíz de API:

```typescript
type MessageRelation =
  | {
      kind: "reply";
      inboundMessageId?: string;
      replyToId?: string;
      threadId?: string;
      quote?: MessageQuote;
    }
  | {
      kind: "followup";
      sessionKey?: string;
      previousMessageId?: string;
    }
  | {
      kind: "broadcast";
      reason?: string;
    }
  | {
      kind: "system";
      reason: "approval" | "task" | "hook" | "cron" | "subagent" | "message_tool" | "cli" | "control_ui" | "automation" | "error";
    };
```

Esto permite que la misma ruta de envío maneje respuestas normales, notificaciones de cron, avisos
de aprobación, finalizaciones de tareas, envíos de herramientas de mensajes, envíos desde la CLI o la interfaz de Control, resultados
de subagentes y envíos de automatización.

### Origen

El origen describe quién produjo un mensaje y cómo OpenClaw debe tratar los ecos de
ese mensaje. Es independiente de la relación: un mensaje puede ser una respuesta a un usuario
y seguir siendo una salida operativa originada por OpenClaw.

```typescript
type MessageOrigin =
  | {
      source: "openclaw";
      schemaVersion: 1;
      kind: "gateway_failure";
      code: "agent_failed_before_reply" | "missing_api_key" | "model_login_expired";
      echoPolicy: "drop_bot_room_echo";
    }
  | {
      source: "user" | "external_bot" | "platform" | "unknown";
    };
```

Core posee el significado de la salida originada por OpenClaw. Los canales poseen cómo ese
origen se codifica en su transporte.

El primer uso requerido es la salida de fallo de la puerta de enlace. Los humanos aún deben ver
mensajes como "El agente falló antes de responder" o "Falta la clave API", pero la salida operativa
taggeada como de OpenClaw no debe aceptarse como entrada creada por el bot en salas
compartidas cuando `allowBots` está habilitado.

### Recibo

Los recibos son de primera clase:

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  sentAt: number;
  raw?: unknown;
};

type MessageReceiptPart = {
  platformMessageId: string;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  index: number;
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  raw?: unknown;
};
```

Los recibos son el puente desde la intención duradera hasta la edición, eliminación, finalización
de vista previa, supresión de duplicados y recuperación futuras.

Un recibo puede describir un mensaje de plataforma o una entrega de varias partes. El texto fragmentado, medios más texto, voz más texto y los respaldos de tarjetas deben preservar todos los ids de plataforma al tiempo que exponen un id principal para el hilado y ediciones posteriores.

## Contexto de recepción

Recibir no debe ser una llamada auxiliar simple. El núcleo necesita un contexto que conozca la deduplicación, el enrutamiento, la grabación de sesión y la política de reconocimiento de la plataforma.

```typescript
type MessageReceiveContext = {
  id: string;
  channel: string;
  accountId?: string;
  input: ChannelMessage;
  ack: ReceiveAckController;
  route: MessageRouteController;
  session: MessageSessionController;
  log: MessageLifecycleLogger;

  dedupe(): Promise<ReceiveDedupeResult>;
  resolve(): Promise<ResolvedInboundMessage>;
  record(resolved: ResolvedInboundMessage): Promise<RecordResult>;
  dispatch(recorded: RecordResult): Promise<DispatchResult>;
  commit(result: DispatchResult): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

Flujo de recepción:

```text
platform event
  -> begin receive context
  -> normalize
  -> classify
  -> dedupe and self-echo gate
  -> route and authorize
  -> record inbound session metadata
  -> dispatch agent run
  -> durable outbound sends happen through send context
  -> commit receive
  -> ack platform when policy allows
```

El reconocimiento (ack) no es una sola cosa. El contrato de recepción debe mantener estas señales separadas:

- **Reconocimiento de transporte:** indica al webhook o socket de la plataforma que OpenClaw aceptó el sobre del evento. Algunas plataformas requieren esto antes del envío.
- **Reconocimiento de desplazamiento de sondeo:** avanza un cursor para que el mismo evento no se vuelva a obtener. Esto no debe avanzar más allá del trabajo que no se puede recuperar.
- **Reconocimiento de registro de entrada:** confirma que OpenClaw guardó suficientes metadatos de entrada para deduplicar y enrutar una reentrega.
- **Recibo visible para el usuario:** comportamiento opcional de lectura/estado/escritura; nunca es un límite de durabilidad.

`ReceiveAckPolicy` controla solo el reconocimiento de transporte o de sondeo. No debe reutilizarse para recibos de lectura o reacciones de estado.

Antes de la autorización del bot, la recepción debe aplicar la política de eco compartida de OpenClaw cuando el canal puede decodificar los metadatos de origen del mensaje:

```typescript
function shouldDropOpenClawEcho(params: { origin?: MessageOrigin; isBotAuthor: boolean; isRoomish: boolean }): boolean {
  return params.isBotAuthor && params.isRoomish && params.origin?.source === "openclaw" && params.origin.kind === "gateway_failure" && params.origin.echoPolicy === "drop_bot_room_echo";
}
```

Esta eliminación se basa en etiquetas, no en texto. Un mensaje de sala creado por un bot con el mismo texto de falla de puerta de enlace visible pero sin metadatos de origen de OpenClaw todavía pasa por la autorización normal de `allowBots`.

La política de reconocimiento es explícita:

```typescript
type ReceiveAckPolicy = { kind: "immediate"; reason: "webhook-timeout" | "platform-contract" } | { kind: "after-record" } | { kind: "after-durable-send" } | { kind: "manual" };
```

El sondeo de Telegram ahora utiliza la política de reconocimiento de contexto de recepción para su marca de agua de reinicio persistida. El rastreador todavía observa las actualizaciones de grammY a medida que entran en la cadena de middleware, pero OpenClaw solo guarda el id de actualización completada segura después de un envío exitoso, dejando las actualizaciones fallidas o pendientes más bajas reproducibles después de un reinicio. El desplazamiento de obtención `getUpdates` aguas arriba de Telegram todavía está controlado por la biblioteca de sondeo, por lo que el corte más profundo restante es una fuente de sondeo completamente duradera si necesitamos reentrega a nivel de plataforma más allá de la marca de agua de reinicio de OpenClaw. Las plataformas de webhook pueden necesitar un reconocimiento HTTP inmediato, pero todavía necesitan deduplicación de entrada e intenciones de envío de salida duraderas porque los webhooks pueden reentregar.

## Contexto de envío

El envío también se basa en el contexto:

```typescript
type MessageSendContext = {
  id: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  intent: DurableSendIntent;
  attempt: number;
  signal: AbortSignal;
  previousReceipt?: MessageReceipt;
  preview?: LiveMessageState;
  log: MessageLifecycleLogger;

  render(): Promise<RenderedMessageBatch>;
  previewUpdate(rendered: RenderedMessageBatch): Promise<LiveMessageState>;
  send(rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit(receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete(receipt: MessageReceipt): Promise<void>;
  commit(receipt: MessageReceipt): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

Orquestación preferida:

```typescript
await core.messages.withSendContext(message, async (ctx) => {
  const rendered = await ctx.render();

  if (ctx.preview?.canFinalizeInPlace) {
    return await ctx.edit(ctx.preview.receipt, rendered);
  }

  return await ctx.send(rendered);
});
```

El auxiliar se expande a:

```text
begin durable intent
  -> render
  -> optional preview/edit/stream work
  -> mark sending
  -> final platform send or final edit
  -> mark committing with raw receipt
  -> commit receipt
  -> ack durable intent
  -> fail durable intent on classified failure
```

La intención debe existir antes de la E/S de transporte. Un reinicio después de comenzar pero antes de confirmar es recuperable.

El límite peligroso es después del éxito de la plataforma y antes de la confirmación del recibo. Si un proceso muere allí, OpenClaw no puede saber si existe el mensaje de la plataforma a menos que el adaptador proporcione idempotencia nativa o una ruta de reconciliación de recibos. Esos intentos deben reanudarse en `unknown_after_send`, no repetirse a ciegas. Los canales sin reconciliación pueden elegir la repetición al menos una vez solo si los mensajes visibles duplicados son un compromiso aceptable y documentado para ese canal y relación. El puente de reconciliación actual del SDK requiere que el adaptador declare `reconcileUnknownSend`, luego le pide a `durableFinal.reconcileUnknownSend` que clasifique una entrada desconocida como `sent`, `not_sent`, o `unresolved`; solo `not_sent` permite la repetición, y las entradas sin resolver permanecen terminales o solo reintentan la verificación de reconciliación.

La política de durabilidad debe ser explícita:

```typescript
type MessageDurabilityPolicy = "required" | "best_effort" | "disabled";
```

`required` significa que el núcleo debe fallar cerrado cuando no puede escribir la intención duradera. `best_effort` puede continuar cuando la persistencia no está disponible. `disabled` mantiene el comportamiento de envío directo antiguo. Durante la migración, los envoltorios heredados y los asistentes de compatibilidad pública predeterminan a `disabled`; no deben inferir `required` del hecho de que un canal tiene un adaptador de salida genérico.

Los contextos de envío también poseen efectos posteriores al envío locales del canal. Una migración no es segura si la entrega duradera omite el comportamiento local que se adjuntó anteriormente a la ruta de envío directo del canal. Los ejemplos incluyen cachés de supresión de eco propio, marcadores de participación en hilos, anclajes de edición nativos, renderizado de firma de modelo y protecciones contra duplicados específicas de la plataforma. Esos efectos deben moverse al adaptador de envío, al adaptador de renderizado o a un enlace de contexto de envío con nombre antes de que ese canal pueda habilitar la entrega final genérica duradera.

Los asistentes de envío deben devolver recibos de vuelta a su llamador. Los envoltorios duraderos no pueden tragarse los ids de los mensajes ni reemplazar un resultado de entrega del canal con `undefined`; los despachadores almacenados en búfer utilizan esos ids para anclajes de hilos, ediciones posteriores, finalización de vistas previas y supresión de duplicados.

Los envíos de reserva operan en lotes, no en cargas individuales. Las reescrituras de respuestas silenciosas, la reserva de medios, la reserva de tarjetas y la proyección de fragmentos pueden producir más de un mensaje entregable, por lo que un contexto de envío debe entregar todo el lote proyectado o documentar explícitamente por qué solo una carga es válida.

```typescript
type RenderedMessageBatch = {
  units: RenderedMessageUnit[];
  atomicity: "all_or_retry_remaining" | "best_effort_parts";
  idempotencyKey: string;
};

type RenderedMessageUnit = {
  index: number;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  payload: unknown;
  required: boolean;
};
```

Cuando dicha reserva es duradera, todo el lote proyectado debe estar representado por una intención de envío duradera u otro plan de lote atómico. Registrar cada carga una por una no es suficiente: un fallo entre cargas puede dejar una reserva parcialmente visible sin un registro duradero para las cargas restantes. La recuperación debe saber qué unidades ya tienen recibos y reproducir solo las unidades faltantes o marcar el lote `unknown_after_send` hasta que el adaptador lo concilie.

## Contexto en vivo

El comportamiento de vista previa, edición, progreso y transmisión debe ser un ciclo de vida opcional.

```typescript
type MessageLiveAdapter = {
  begin?(ctx: MessageSendContext): Promise<LiveMessageState>;
  update?(ctx: MessageSendContext, state: LiveMessageState, update: LiveMessageUpdate): Promise<LiveMessageState>;
  finalize?(ctx: MessageSendContext, state: LiveMessageState, final: RenderedMessageBatch): Promise<MessageReceipt>;
  cancel?(ctx: MessageSendContext, state: LiveMessageState, reason: LiveCancelReason): Promise<void>;
};
```

El estado en vivo es lo suficientemente duradero para recuperarse o suprimir duplicados:

```typescript
type LiveMessageState = {
  mode: "partial" | "block" | "progress" | "native";
  receipt?: MessageReceipt;
  visibleSince?: number;
  canFinalizeInPlace: boolean;
  lastRenderedHash?: string;
  staleAfterMs?: number;
};
```

Esto debería cubrir el comportamiento actual:

- Envío y edición de vista previa en Telegram, con final nuevo después de la antigüedad de la vista previa obsoleta.
- Envío y edición de vista previa en Discord, cancelación en medio/error/respuesta explícita.
- Transmisión nativa o vista previa de borrador en Slack, dependiendo de la forma del hilo.
- Finalización de la publicación de borrador en Mattermost.
- Finalización del evento de borrador o redacción en caso de discrepancia en Matrix.
- Flujo de progreso nativo en Teams.
- Flujo o reserva acumulada del bot de QQ.

## Superficie del adaptador

El objetivo público del SDK debe ser una subruta:

```typescript
import { defineChannelMessageAdapter } from "openclaw/plugin-sdk/channel-message";
```

Forma del objetivo:

```typescript
type ChannelMessageAdapter = {
  receive?: MessageReceiveAdapter;
  send: MessageSendAdapter;
  live?: MessageLiveAdapter;
  origin?: MessageOriginAdapter;
  render?: MessageRenderAdapter;
  capabilities: MessageCapabilities;
};
```

Adaptador de envío:

```typescript
type MessageSendAdapter = {
  send(ctx: MessageSendContext, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit?(ctx: MessageSendContext, receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  classifyError?(ctx: MessageSendContext, error: unknown): DeliveryFailureKind;
  reconcileUnknownSend?(ctx: MessageSendContext): Promise<MessageReceipt | null>;
  afterSendSuccess?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  afterCommit?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
};
```

Adaptador de recepción:

```typescript
type MessageReceiveAdapter<TRaw = unknown> = {
  normalize(raw: TRaw, ctx: MessageNormalizeContext): Promise<ChannelMessage>;
  classify?(message: ChannelMessage): Promise<MessageEventClass>;
  preflight?(message: ChannelMessage, event: MessageEventClass): Promise<MessagePreflightResult>;
  ackPolicy?(message: ChannelMessage, event: MessageEventClass): ReceiveAckPolicy;
};
```

Antes de la autorización previa al vuelo, el núcleo debe ejecutar el predicado de eco compartido de OpenClaw siempre que `origin.decode` devuelva metadatos de origen OpenClaw. El adaptador de recepción proporciona datos de la plataforma, como el autor del bot y la forma de la sala; el núcleo posee la decisión de descarte y el ordenamiento para que los canales no reimplementen filtros de texto.

Adaptador de origen:

```typescript
type MessageOriginAdapter<TRaw = unknown, TNative = unknown> = {
  encode?(origin: MessageOrigin): TNative | undefined;
  decode?(raw: TRaw): MessageOrigin | undefined;
};
```

Core establece `MessageOrigin`. Los canales solo lo traducen a y desde metadatos de transporte nativos. Slack asigna esto a `chat.postMessage({ metadata })` e `message.metadata` entrante; Matrix puede asignarlo a contenido de evento adicional; los canales sin metadatos nativos pueden usar un registro de recibos/saliente cuando esa sea la mejor aproximación disponible.

Capacidades:

```typescript
type MessageCapabilities = {
  text: { maxLength?: number; chunking?: boolean };
  attachments?: {
    upload: boolean;
    remoteUrl: boolean;
    voice?: boolean;
  };
  threads?: {
    reply: boolean;
    topic?: boolean;
    nativeThread?: boolean;
  };
  live?: {
    edit: boolean;
    delete: boolean;
    nativeStream?: boolean;
    progress?: boolean;
  };
  delivery?: {
    idempotencyKey?: boolean;
    retryAfter?: boolean;
    receiptRequired?: boolean;
  };
};
```

## Reducción del SDK público

La nueva superficie pública debe absorber o dejar obsoletas estas áreas conceptuales:

- `reply-runtime`
- `reply-dispatch-runtime`
- `reply-reference`
- `reply-chunking`
- `reply-payload`
- `inbound-reply-dispatch`
- `channel-reply-pipeline`
- la mayoría de los usos públicos de `outbound-runtime`
- ayudantes de ciclo de vida de flujo de borrador ad hoc

Las subrutas de compatibilidad pueden permanecer como contenedores, pero los nuevos complementos de terceros no deberían necesitarlos.

Los complementos integrados pueden mantener importaciones internas de ayudantes a través de subrutas de tiempo de ejecución reservadas durante la migración. La documentación pública debe guiar a los autores de complementos hacia `plugin-sdk/channel-message` una vez que exista.

## Relación con el turno del canal

`runtime.channel.turn.*` debe mantenerse durante la migración.

Debe convertirse en un adaptador de compatibilidad:

```text
channel.turn.run
  -> messages.receive context
  -> session dispatch
  -> messages.send context for visible output
```

`channel.turn.runPrepared` también debe permanecer inicialmente:

```text
channel-owned dispatcher
  -> messages.receive record/finalize bridge
  -> messages.live for preview/progress
  -> messages.send for final delivery
```

Después de que se conecten todos los complementos integrados y las rutas de compatibilidad de terceros conocidas, `channel.turn` puede dejarse obsoleto. No debe eliminarse hasta que exista una ruta de migración del SDK publicada y pruebas de contrato que demuestren que los complementos antiguos aún funcionan o fallan con un error de versión claro.

## Salvaguardas de compatibilidad

Durante la migración, la entrega duradera genérica es opcional para cualquier canal cuya devolución de llamada de entrega existente tenga efectos secundarios más allá de "enviar esta carga útil".

Los puntos de entrada heredados no son duraderos de forma predeterminada:

- `channel.turn.run` y `dispatchAssembledChannelTurn` usan la devolución de llamada de entrega del canal a menos que ese canal proporcione explícitamente un objeto de política/opciones duradero auditado.
- `channel.turn.runPrepared` permanece propiedad del canal hasta que el despachador preparado llama explícitamente al contexto de envío.
- Los ayudantes de compatibilidad pública como `recordInboundSessionAndDispatchReply`,
  `dispatchInboundReplyWithBase` y los ayudantes de MD directo nunca inyectan entrega
  duradera genérica antes de la devolución de llamada `deliver` o `reply` proporcionada por el llamador.

Para los tipos de puente de migración, `durable: undefined` significa "no duradero". La
ruta duradera se habilita solo mediante un valor de política/opciones explícito. `durable:
  false` puede permanecer como una ortografía de compatibilidad, pero la implementación no debe
requerir que cada canal no migrado lo agregue.

El código de puente actual debe mantener explícita la decisión de durabilidad:

- La entrega final duradera devuelve un estado discriminado. `handled_visible` y
  `handled_no_send` son terminales; `unsupported` y `not_applicable` pueden recurrir
  a la entrega propiedad del canal; `failed` propaga el error de envío.
- La entrega final duradera genérica está limitada por las capacidades del adaptador, como la
  entrega silenciosa, la preservación del objetivo de respuesta, la preservación de citas nativas y los
  enlaces de envío de mensajes. La falta de paridad debe elegir la entrega propiedad del canal,
  no un envío genérico que cambie el comportamiento visible para el usuario.
- Los envíos duraderos respaldados por cola exponen una referencia de intención de entrega. Los campos de
  sesión `pendingFinalDelivery*` existentes pueden transportar el id de intención durante la
  transición; el estado final es un almacén `MessageSendIntent` en lugar de texto de
  respuesta congelado más campos de contexto ad hoc.

No habilite la ruta duradera genérica para un canal hasta que todos estos sean
verdaderos:

- El adaptador de envío genérico ejecuta el mismo comportamiento de renderizado y transporte que
  la ruta directa antigua.
- Los efectos secundarios locales posteriores al envío se preservan a través del contexto de envío.
- El adaptador devuelve recibos o resultados de entrega con todos los ids de mensaje de
  la plataforma.
- Las rutas del despachador preparadas llaman al nuevo contexto de envío o permanecen documentadas
  como fuera de la garantía duradera.
- La entrega alternativa maneja cada carga proyectada, no solo la primera.
- La entrega alternativa duradera registra toda la matriz de cargas proyectadas como una
  intención reproducible o un plan por lotes.

Riesgos de migración concretos a preservar:

- iMessage monitor registra los mensajes enviados en una caché de eco después de
  un envío exitoso. Los envíos finales duraderos aún deben llenar esa caché; de lo
  contrario, OpenClaw puede volver a ingerir sus propias respuestas finales como
  mensajes entrantes del usuario.
- Tlon añade una firma de modelo opcional y registra los hilos en los que
  ha participado después de las respuestas grupales. El envío duradero genérico
  no debe omitir esos efectos; muévalos a los adaptadores de renderizado/envío/finalización
  de Tlon o mantenga a Tlon en la ruta propiedad del canal.
- Discord y otros despachadores preparados ya son dueños del comportamiento de
  entrega directa y vista previa. No están cubiertos por una garantía duradera
  de turno ensamblado hasta que sus despachadores preparados enruten los finales
  explícitamente a través del contexto de envío.
- El envío de reserva silencioso de Telegram debe entregar la matriz completa de
  cargas útiles proyectadas. Un acceso directo de una sola carga útil puede descartar
  cargas útiles de reserva adicionales después de la proyección.
- LINE, Zalo, Nostr y otras rutas ensambladas/ayudantes existentes pueden
  tener manejo de tokens de respuesta, proxies de medios, cachés de mensajes
  enviados, limpieza de carga/estado, o destinos solo de devolución de llamada.
  Permanecen en la entrega propiedad del canal hasta que esos semánticos sean
  representados por el adaptador de envío y verificados por pruebas.
- Los ayudantes de DM directo pueden tener una devolución de llamada de respuesta
  que es el único objetivo de transporte correcto. El saliente genérico no debe
  suponer a partir de `OriginatingTo` o `To` y omitir
  esa devolución de llamada.
- El resultado de falla de la puerta de enlace de OpenClaw debe permanecer visible
  para los humanos, pero los ecos de sala creados por el bot etiquetados deben
  descartarse antes de la autorización `allowBots`.
  Los canales no deben implementar esto con filtros de prefijo de texto visible
  excepto como una breve medida de emergencia; el contrato duradero son metadatos
  de origen estructurados.

## Almacenamiento interno

La cola duradera debe almacenar intenciones de envío de mensajes, no cargas útiles de respuesta.

```typescript
type DurableSendIntent = {
  id: string;
  idempotencyKey: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  batch?: RenderedMessageBatch;
  liveState?: LiveMessageState;
  status: "pending" | "sending" | "committing" | "unknown_after_send" | "sent" | "failed" | "cancelled";
  attempt: number;
  nextAttemptAt?: number;
  receipt?: MessageReceipt;
  partialReceipt?: MessageReceipt;
  failure?: DeliveryFailure;
  createdAt: number;
  updatedAt: number;
};
```

Bucle de recuperación:

```text
load pending or sending intents
  -> acquire idempotency lock
  -> skip if receipt already committed
  -> reconstruct send context
  -> render if needed
  -> reconcile unknown_after_send if needed
  -> call adapter send/edit/finalize
  -> commit receipt, mark unknown_after_send, or schedule retry
```

La cola debe mantener suficiente identidad para reproducir a través de la misma cuenta,
hilo, objetivo, política de formato y reglas de medios después del reinicio.

## Clases de fallo

Los adaptadores de canal clasifican los fallos de transporte en categorías cerradas:

```typescript
type DeliveryFailureKind = "transient" | "rate_limit" | "auth" | "permission" | "not_found" | "invalid_payload" | "conflict" | "cancelled" | "unknown";
```

Política principal:

- Reintentar `transient` y `rate_limit`.
- No reintentar `invalid_payload` a menos que exista una reserva de renderizado.
- No reintentar `auth` ni `permission` hasta que cambie la configuración.
- Para `not_found`, permitir que la finalización en vivo vuelva de la edición a un envío nuevo cuando el canal declare que es seguro.
- Para `conflict`, usar las reglas de recibos/idempotencia para decidir si el mensaje ya existe.
- Cualquier error después de que el adaptador podría haber completado la E/S de la plataforma pero antes de la confirmación del recibo se convierte en `unknown_after_send` a menos que el adaptador pueda probar que la operación de la plataforma no ocurrió.

## Asignación de canal

| Canal           | Migración de objetivo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telegram        | Política de confirmación de recepción más envíos finales duraderos. El adaptador en vivo gestiona el envío más la edición de la vista previa, el envío final de la vista previa obsoleta, los temas, la omisión de la vista previa de respuesta-cita, la alternativa de medios y el manejo de reintentos posteriores.                                                                                                                                                                                     |
| Discord         | El adaptador de envío envuelve la entrega duradera de carga útil existente. El adaptador en vivo gestiona la edición del borrador, el borrador de progreso, la cancelación de la vista previa de medios/error, la preservación del objetivo de respuesta y los recibos de ID de mensaje. Auditar los ecos de fallos de puerta de enlace creados por bots en salas compartidas; usar un registro de salida u otro equivalente nativo si Discord no puede llevar metadatos de origen en mensajes normales.  |
| Slack           | El adaptador de envío maneja las publicaciones de chat normales. El adaptador en vivo elige la transmisión nativa cuando la forma del hilo lo soporta, de lo contrario, vista previa de borrador. Los recibos preservan las marcas de tiempo de los hilos. El adaptador de origen mapea los fallos de puerta de enlace de OpenClaw a Slack `chat.postMessage.metadata` y elimina los ecos de salas de bots etiquetados antes de la autorización `allowBots`.                                              |
| WhatsApp        | El adaptador de envío gestiona el envío de texto/medios con intenciones finales duraderas. El adaptador de recepción maneja la mención del grupo y la identidad del remitente. En vivo puede permanecer ausente hasta que WhatsApp tenga un transporte editable.                                                                                                                                                                                                                                          |
| Matrix          | El adaptador en vivo gestiona las ediciones de eventos de borrador, la finalización, la redacción, las restricciones de medios cifrados y la alternativa de discordancia del objetivo de respuesta. El adaptador de recepción gestiona la hidratación y deduplicación de eventos cifrados. El adaptador de origen debe codificar el origen del fallo de puerta de enlace de OpenClaw en el contenido del evento de Matrix y eliminar los ecos de salas de bots configurados antes del manejo `allowBots`. |
| Mattermost      | El adaptador en vivo gestiona una publicación de borrador, el plegado de progreso/herramientas, la finalización en su lugar y la alternativa de envío nuevo.                                                                                                                                                                                                                                                                                                                                              |
| Microsoft Teams | El adaptador en vivo posee el comportamiento nativo de progreso y flujo de bloques. El adaptador de envío posee las actividades y los recibos de archivos adjuntos/tarjetas.                                                                                                                                                                                                                                                                                                                              |
| Feishu          | El adaptador de renderizado posee la representación de texto/tarjeta/sin formato. El adaptador en vivo posee las tarjetas de transmisión y la supresión final duplicada. El adaptador de envío posee los comentarios, las sesiones de temas, los medios y la supresión de voz.                                                                                                                                                                                                                            |
| QQ Bot          | El adaptador en vivo posee la transmisión C2C, el tiempo de espera del acumulador y el envío final de reserva. El adaptador de renderizado posee las etiquetas de medios y el texto como voz.                                                                                                                                                                                                                                                                                                             |
| Signal          | Adaptador de recepción más envío simple. Sin adaptador en vivo a menos que signal-cli agregue soporte de edición confiable.                                                                                                                                                                                                                                                                                                                                                                               |
| iMessage        | Adaptador de recepción más envío simple. El envío de iMessage debe conservar la población del caché de eco del monitor antes de que los finales duraderos puedan omitir la entrega del monitor.                                                                                                                                                                                                                                                                                                           |
| Google Chat     | Adaptador de recepción más envío simple con la relación de hilo asignada a espacios e IDs de hilo. Auditar el comportamiento de la sala `allowBots=true` para los ecos de falla de la puerta de enlace de OpenClaw etiquetados.                                                                                                                                                                                                                                                                           |
| LINE            | Adaptador de recepción más envío simple con las restricciones del token de respuesta modeladas como capacidad de destino/relación.                                                                                                                                                                                                                                                                                                                                                                        |
| Nextcloud Talk  | Puente de recepción del SDK más adaptador de envío.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| IRC             | Adaptador de recepción más envío simple, sin recibos de edición duraderos.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Nostr           | Adaptador de recepción y envío para MD cifrados; los recibos son IDs de eventos.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Canal de QA     | Adaptador de prueba de contrato para el comportamiento de recepción, envío, en vivo, reintento y recuperación.                                                                                                                                                                                                                                                                                                                                                                                            |
| Synology Chat   | Adaptador de recepción más envío simple.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Tlon            | El adaptador de envío debe conservar la representación de la firma del modelo y el seguimiento de hilos participados antes de que se habilite la entrega final duradera genérica.                                                                                                                                                                                                                                                                                                                         |
| Twitch          | Adaptador de recepción más envío simple con clasificación de límite de tasa.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Zalo            | Adaptador de recepción más envío simple.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Zalo Personal   | Adaptador de recepción más envío simple.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Plan de migración

### Fase 1: Dominio de mensaje interno

- Agregar tipos `src/channels/message/*` para mensajes, destinos, relaciones,
  orígenes, recibos, capacidades, intenciones duraderas, contexto de recepción, contexto de envío,
  contexto en vivo y clases de falla.
- Agregar `origin?: MessageOrigin` al tipo de carga útil del puente de migración utilizado por
  la entrega de respuesta actual, luego mover ese campo a `ChannelMessage` y tipos de mensaje renderizados
  a medida que la refactorización reemplaza las cargas útiles de respuesta.
- Mantener esto interno hasta que los adaptadores y las pruebas confirmen la forma.
- Agregar pruebas unitarias puras para transiciones de estado y serialización.

### Fase 2: Núcleo de envío duradero

- Mover la cola de salida existente de la durabilidad del payload de respuesta a intenciones de envío de mensajes duraderas.
- Permitir que una intención de envío durable lleve una matriz de payload proyectada o un plan por lotes, no solo un payload de respuesta.
- Conservar el comportamiento actual de recuperación de la cola a través de una conversión de compatibilidad.
- Hacer que `deliverOutboundPayloads` llame a `messages.send`.
- Establecer la durabilidad del envío final como predeterminada y fallar de forma cerrada cuando la intención durable no se pueda escribir en el nuevo ciclo de vida del mensaje, después de que el adaptador declare la seguridad de repetición. Las rutas de compatibilidad existentes de turnos de canal y SDK siguen siendo de envío directo de forma predeterminada durante esta fase.
- Registrar los recibos de manera consistente.
- Devolver los recibos y los resultados de entrega al llamador original del despachador en lugar de tratar el envío durable como un efecto secundario terminal.
- Persistir el origen del mensaje a través de intenciones de envío duraderas para que la recuperación, la repetición y los envíos fragmentados preserven la procedencia operativa de OpenClaw.

### Fase 3: Puente de Turno de Canal

- Reimplementar `channel.turn.run` y `dispatchAssembledChannelTurn` sobre `messages.receive` y `messages.send`.
- Mantener los tipos de hechos actuales estables.
- Mantener el comportamiento heredado de forma predeterminada. Un canal de turnos ensamblados se vuelve durable solo cuando su adaptador opta explícitamente con una política de durabilidad segura para repetición.
- Mantener `durable: false` como una escotilla de escape de compatibilidad para las rutas que finalizan ediciones nativas y aún no pueden repetirse de forma segura, pero no confiar en los marcadores `false` para proteger los canales no migrados.
- Establecer la durabilidad de turnos ensamblados de forma predeterminada solo en el nuevo ciclo de vida del mensaje, después de que la asignación de canal demuestre que la ruta de envío genérica preserva la semántica de entrega del canal antiguo.

### Fase 4: Puente de Despachador Preparado

- Reemplazar `deliverDurableInboundReplyPayload` con un puente de contexto de envío.
- Mantener el asistente antiguo como un contenedor.
- Portar Telegram, WhatsApp, Slack, Signal, iMessage y Discord primero porque ya tienen trabajo final durable o rutas de envío más simples.
- Tratar cada despachador preparado como no cubierto hasta que acepte explícitamente el contexto de envío. La documentación y las entradas del registro de cambios deben decir "turnos de canal ensamblados" o nombrar las rutas de canal migradas en lugar de reclamar todas las respuestas finales automáticas.
- Mantenga `recordInboundSessionAndDispatchReply`, los asistentes de DM directa y otros
  asistentes públicos de compatibilidad preservando el comportamiento. Pueden exponer una
  opción explícita de contexto de envío más adelante, pero no deben intentar automáticamente la entrega duradera
  genérica antes de la devolución de llamada de entrega propiedad del llamador.

### Fase 5: Ciclo de vida unificado en vivo

- Construya `messages.live` con dos adaptadores de prueba:
  - Telegram para enviar más editar más envío final obsoleto.
  - Matrix para la finalización del borrador más la alternativa de redacción.
- Luego migre Discord, Slack, Mattermost, Teams, QQ Bot y Feishu.
- Elimine el código duplicado de finalización de vista previa solo después de que cada canal tenga
  pruebas de paridad.

### Fase 6: SDK público

- Agregue `openclaw/plugin-sdk/channel-message`.
- Documentarlo como la API preferida del complemento de canal.
- Actualice las exportaciones de paquetes, el inventario de puntos de entrada, las líneas base de API generadas y
  la documentación del SDK de complementos.
- Incluya `MessageOrigin`, los enlaces de codificación/descodificación de origen y el predicado compartido
  `shouldDropOpenClawEcho` en la superficie del SDK de mensajes del canal.
- Mantenga los envoltorios de compatibilidad para las antiguas subrutas.
- Marque los asistentes del SDK nombrados como respuesta como obsoletos en la documentación después de que los complementos incluidos sean
  migrados.

### Fase 7: Todos los remitentes

Mueva todos los productores salientes que no sean de respuesta a `messages.send`:

- notificaciones de cron y latido
- finalizaciones de tareas
- resultados de enlaces
- solicitudes de aprobación y resultados de aprobación
- envíos de herramientas de mensajes
- anuncios de finalización de subagentes
- envíos explícitos de CLI o interfaz de usuario de Control
- rutas de automatización/difusión

Aquí es donde el modelo deja de ser "respuestas del agente" y se convierte en "OpenClaw envía
mensajes".

### Fase 8: Deprecar Turn

- Mantenga `channel.turn` como un envoltorio durante al menos una ventana de compatibilidad.
- Publique notas de migración.
- Ejecute pruebas de compatibilidad del SDK de complementos contra importaciones antiguas.
- Elimine u oculte los asistentes internos antiguos solo después de que ningún complemento incluido los necesite
  y los contratos de terceros tengan un reemplazo estable.

## Plan de pruebas

Pruebas unitarias:

- Serialización y recuperación de la intención de envío duradera.
- Reutilización de clave de idempotencia y supresión de duplicados.
- Confirmación de recibo y omisión de repetición.
- Recuperación de `unknown_after_send` que reconcilia antes de repetir cuando un adaptador
  admite la conciliación.
- Política de clasificación de fallos.
- Secuenciación de la política de acuse de recibo de recepción.
- Mapeo de relaciones para envíos de respuesta, seguimiento, sistema y difusión.
- Factoría de orígenes de fallo de puerta de enlace y predicado `shouldDropOpenClawEcho`.
- Preservación del origen a través de la normalización de la carga útil, fragmentación, serialización de la cola duradera y recuperación.

Pruebas de integración:

- `channel.turn.run` adaptador simple todavía registra y envía.
- La entrega de eventos ensamblados heredados no es duradera a menos que el canal lo active explícitamente.
- `channel.turn.runPrepared` puente todavía registra y finaliza.
- Los asistentes de compatibilidad pública llaman a las devoluciones de llamada de entrega propiedad del llamador por defecto y no realizan un envío genérico antes de esas devoluciones de llamada.
- La entrega alternativa duradera reproduce toda la matriz de cargas útiles proyectadas después del reinicio y no puede dejar las cargas útiles posteriores sin registrar después de un bloqueo temprano.
- La entrega duradera de eventos ensamblados devuelve los IDs de los mensajes de la plataforma al despachador almacenado en búfer.
- Los ganchos de entrega personalizados todavía devuelven los ids de mensajes de plataforma cuando la entrega duradera está deshabilitada o no está disponible.
- La respuesta final sobrevive al reinicio entre la finalización del asistente y el envío a la plataforma.
- El borrador de vista previa se finaliza en su lugar cuando se permite.
- El borrador de vista previa se cancela o redacta cuando una discrepancia de medio/error/destino de respuesta requiere una entrega normal.
- La transmisión en bloques y la transmisión de vista previa no entregan ambos el mismo texto.
- Los medios transmitidos temprano no se duplican en la entrega final.

Pruebas de canal:

- Respuesta a tema de Telegram con reconocimiento de sondeo retrasado hasta la marca de agua segura completada del contexto de recepción.
- Recuperación de sondeo de Telegram para actualizaciones aceptadas pero no entregadas cubiertas por el modelo de desplazamiento seguro completado persistido.
- La vista previa obsoleta de Telegram envía un nuevo final y limpia la vista previa.
- La alternativa silenciosa de Telegram envía cada carga útil alternativa proyectada.
- La durabilidad de la alternativa silenciosa de Telegram registra la matriz completa de alternativas proyectadas de forma atómica, no una intención duradera de una sola carga útil por iteración de bucle.
- Cancelación de vista previa de Discord al medio/error/respuesta explícita.
- Los finales del despachador preparado de Discord pasan a través del contexto de envío antes de que los documentos o el registro de cambios reclamen la durabilidad de respuesta final de Discord.
- Los envíos finales duraderos de iMessage completan el caché de eco de mensajes enviados del monitor.
- Las rutas de entrega heredadas de LINE, Zalo y Nostr no se omiten mediante el envío genérico duradero hasta que existan sus pruebas de paridad de adaptador.
- La entrega mediante devolución de llamada de Direct-DM/Nostr sigue siendo autoritativa a menos que se migre explícitamente a un destino de mensaje completo y un adaptador de envío seguro contra retransmisiones.
- Los mensajes de error de puerta de enlace de OpenClaw etiquetados en Slack permanecen visibles en la salida, los ecos de salas de bot etiquetados se eliminan antes de `allowBots` y los mensajes de bot sin etiquetar con el mismo texto visible siguen la autorización de bot normal.
- La alternativa de transmisión nativa de Slack a la vista previa de borrador en MD de nivel superior.
- Finalización de la vista previa de Matrix y alternativa de redacción.
- Los ecos de sala de error de puerta de enlace de OpenClaw etiquetados en Matrix desde cuentas de bot configuradas se eliminan antes del manejo de `allowBots`.
- Las auditorías de cascada de errores de puerta de enlace de sala compartida de Discord y Google Chat cubren los modos `allowBots` antes de reclamar protección genérica allí.
- Finalización de borrador de Mattermost y alternativa de envío nuevo.
- Finalización del progreso nativo de Teams.
- Supresión final de duplicados de Feishu.
- Alternativa de tiempo de espera del acumulador del QQ Bot.
- Los envíos finales duraderos de Tlon preservan el renderizado de la firma del modelo y el seguimiento de hilos participados.
- Envíos finales duraderos simples de WhatsApp, Signal, iMessage, Google Chat, LINE, IRC, Nostr, Nextcloud Talk, Synology Chat, Tlon, Twitch, Zalo y Zalo Personal.

Validación:

- Archivos Vitest específicos durante el desarrollo.
- `pnpm check:changed` en Testbox para toda la superficie cambiada.
- `pnpm check` más amplio en Testbox antes de implementar la refactorización completa o después de cambios en el SDK público/exportaciones.
- Prueba de humo en vivo o en canal qa para al menos un canal con capacidad de edición y un canal simple de solo envío antes de eliminar los envoltorios de compatibilidad.

## Preguntas abiertas

- Si Telegram debería eventualmente reemplazar la fuente del ejecutor grammY con una fuente de sondeo completamente duradera que pueda controlar la reentrega a nivel de plataforma, no solo la marca de agua de reinicio persistente de OpenClaw.
- Si el estado de vista previa en vivo duradero debe almacenarse en el mismo registro de cola que la intención de envío final o en un almacén de estado en vivo hermano.
- Cuánto tiempo se mantienen documentados los envoltorios de compatibilidad después del lanzamiento de `plugin-sdk/channel-message`.
- Si los complementos de terceros deben implementar adaptadores de recepción directamente o solo proporcionar enlaces de normalización/envío/en vivo a través de `defineChannelMessageAdapter`.
- Qué campos de recibo es seguro exponer en el SDK público frente al estado
  interno del tiempo de ejecución.
- Si los efectos secundarios, como las cachés de eco propio y los marcadores de
  hilos participados, deben modelarse como enlaces de contexto de envío, pasos de
  finalización propiedad del adaptador o suscriptores de recibos.
- Qué canales tienen metadatos de origen nativos, cuáles necesitan registros
  de salida persistentes y cuáles no pueden ofrecer una supresión de eco fiable
  entre bots.

## Criterios de aceptación

- Cada canal de mensajes incluido envía la salida visible final a través de
  `messages.send`.
- Cada canal de mensajes entrantes entra a través de `messages.receive` o un
  contenedor de compatibilidad documentado.
- Cada canal de vista previa/edición/transmisión utiliza `messages.live` para el estado del borrador y
  la finalización.
- `channel.turn` es solo un contenedor.
- Los auxiliares del SDK con nombre de respuesta son exportaciones de compatibilidad, no la ruta recomendada.
- La recuperación duradera puede reproducir envíos finales pendientes después de un reinicio sin perder
  la respuesta final ni duplicar los envíos ya confirmados; los envíos cuyo
  resultado en la plataforma es desconocido se concilian antes de la reproducción o se documentan como
  al menos una vez para ese adaptador.
- Los envíos finales duraderos fallan de forma cerrada cuando no se puede escribir la intención
  duradera, a menos que la persona que llama seleccione explícitamente un modo no duradero documentado.
- Los auxiliares de compatibilidad de turnos de canal heredados y del SDK tienen como valor predeterminado la entrega
  directa propiedad del canal; el envío duradero genérico es solo una opción explícita.
- Los recibos conservan todos los ids de mensajes de la plataforma para entregas de varias partes y un
  id principal para comodidad de hilos/ediciones.
- Los contenedores duraderos preservan los efectos secundarios locales del canal antes de reemplazar las devoluciones de llamada de
  entrega directa.
- Los despachadores preparados no se cuentan como duraderos hasta que su ruta de entrega final
  utiliza explícitamente el contexto de envío.
- La entrega alternativa maneja cada carga proyectada.
- La entrega alternativa duradera registra cada carga proyectada en una intención
  o plan por lotes reproducible.
- La salida de fallo de puerta de enlace originada por OpenClaw es visible para los humanos, pero los ecos de sala
  creados por el bot etiquetados se eliminan antes de la autorización del bot en los canales que
  declaran compatibilidad con el contrato de origen.
- Los documentos explican envío, recepción, vivo, estado, recibos, relaciones, política
  de fallos, migración y cobertura de pruebas.

## Relacionado

- [Mensajes](/es/concepts/messages)
- [Transmisión y fragmentación](/es/concepts/streaming)
- [Borradores de progreso](/es/concepts/progress-drafts)
- [Política de reintentos](/es/concepts/retry)
- [Núcleo de turno de canal](/es/plugins/sdk-channel-turn)
