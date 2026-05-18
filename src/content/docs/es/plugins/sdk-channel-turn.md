---
summary: "runtime.channel.turn: el kernel de eventos entrantes compartido que los complementos de canal integrados y de terceros utilizan para registrar, enviar y finalizar turnos de agente"
title: "Kernel de turno de canal"
sidebarTitle: "Turno de canal"
read_when:
  - You are building a channel plugin and want the shared inbound event lifecycle
  - You are migrating a channel monitor off hand-rolled record/dispatch glue
  - You need to understand admission, ingest, classify, preflight, resolve, record, dispatch, and finalize stages
---

El núcleo de turnos de canal es la máquina de estado de entrada compartida que convierte un evento de plataforma normalizado en un turno de agente. Los complementos de canal proporcionan los datos de la plataforma y la devolución de llamada de entrega. Core posee la orquestación: ingestión, clasificación, preverificación, resolución, autorización, ensamblaje, registro, despacho y finalización.

Use esto cuando su complemento esté en la ruta de acceso rápida de mensajes entrantes. Para eventos que no son mensajes (comandos de barra, modales, interacciones de botones, eventos de ciclo de vida, reacciones, estado de voz), manténgalos localmente en el complemento. El núcleo solo posee eventos que pueden convertirse en un turno de texto de agente.

<Info>Se accede al kernel a través del tiempo de ejecución del complemento inyectado como `runtime.channel.turn.*`. El tipo de tiempo de ejecución del complemento se exporta desde `openclaw/plugin-sdk/core`, por lo que los complementos nativos de terceros pueden usar estos puntos de entrada de la misma manera que lo hacen los complementos de canal integrados.</Info>

## Por qué un núcleo compartido

Los complementos de canal repiten el mismo flujo de entrada: normalizar, enrutar, filtrar, construir un contexto, registrar metadatos de sesión, despachar el turno de agente y finalizar el estado de entrega. Sin un núcleo compartido, un cambio en el filtrado de menciones, respuestas visibles solo para herramientas, metadatos de sesión, historial pendiente o finalización del despacho debe aplicarse por canal.

El núcleo mantiene deliberadamente separados cuatro conceptos:

- `ConversationFacts`: de dónde vino el mensaje
- `RouteFacts`: qué agente y sesión deben procesarlo
- `ReplyPlanFacts`: a dónde deben ir las respuestas visibles
- `MessageFacts`: qué cuerpo y contexto complementario debe ver el agente

Los mensajes directos de Slack, los temas de Telegram, los hilos de Matrix y las sesiones de temas de Feishu los distinguen en la práctica. Tratarlos como un solo identificador causa desviaciones con el tiempo.

## Ciclo de vida de la etapa

El núcleo ejecuta la misma canalización fija independientemente del canal:

1. `ingest` -- el adaptador convierte un evento de plataforma sin procesar en `NormalizedTurnInput`
2. `classify` -- el adaptador declara si este evento puede iniciar un turno de agente
3. `preflight` -- el adaptador realiza deduplicación, eco propio, hidratación, antirrebote, descifrado, relleno previo parcial de hechos
4. `resolve` -- el adaptador devuelve un turno completamente ensamblado (ruta, plan de respuesta, mensaje, entrega)
5. `authorize` -- política de MD, grupo, mención y comando aplicada a los hechos ensamblados
6. `assemble` -- `FinalizedMsgContext` construido a partir de los hechos a través de `buildContext`
7. `record` -- metadatos de la sesión entrante y última ruta persistida
8. `dispatch` -- turno de agente ejecutado a través del despachador de bloques almacenados en búfer
9. `finalize` -- `onFinalize` del adaptador se ejecuta incluso en caso de error de envío

Cada etapa emite un evento de registro estructurado cuando se proporciona una devolución de llamada `log`. Consulte [Observabilidad](#observability).

## Tipos de admisión

El kernel no genera excepciones cuando un turno está restringido. Devuelve un `ChannelTurnAdmission`:

| Tipo          | Cuándo                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispatch`    | El turno es admitido. Se ejecuta el turno del agente y se ejerce la ruta de respuesta visible.                                                                                      |
| `observeOnly` | El turno se ejecuta de extremo a extremo, pero el adaptador de entrega no envía nada visible. Se utiliza para agentes de observador de difusión y otros flujos multiagente pasivos. |
| `handled`     | Un evento de plataforma se consumió localmente (ciclo de vida, reacción, botón, modal). El núcleo omite el despacho.                                                                |
| `drop`        | Ruta omitida. Opcionalmente `recordHistory: true` mantiene el mensaje en el historial del grupo pendiente para que una mención futura tenga contexto.                               |

La admisión puede provenir de `classify` (la clase de evento indicó que no puede iniciar un turno), de `preflight` (deduplicación, eco propio, mención faltante con registro de historial), o del propio `resolveTurn`.

## Puntos de entrada

El tiempo de ejecución expone tres puntos de entrada preferidos para que los adaptadores puedan participar en el nivel que coincida con el canal.

```typescript
runtime.channel.turn.run(...)             // adapter-driven full pipeline
runtime.channel.turn.runAssembled(...)    // already-built context + delivery adapter
runtime.channel.turn.runPrepared(...)     // channel owns dispatch; kernel runs record + finalize
runtime.channel.turn.buildContext(...)    // pure facts to FinalizedMsgContext mapping
```

Dos funciones auxiliares de tiempo de ejecución más antiguas siguen disponibles para la compatibilidad con el Plugin SDK:

```typescript
runtime.channel.turn.runResolved(...)      // deprecated compatibility alias; prefer run
runtime.channel.turn.dispatchAssembled(...) // deprecated compatibility alias; prefer runAssembled
```

### ejecutar (run)

Úselo cuando su canal pueda expresar su flujo de entrada como un `ChannelTurnAdapter<TRaw>`. El adaptador tiene devoluciones de llamada para `ingest`, `classify` opcional, `preflight` opcional, `resolveTurn` obligatorio y `onFinalize` opcional.

```typescript
await runtime.channel.turn.run({
  channel: "tlon",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest(raw) {
      return {
        id: raw.messageId,
        timestamp: raw.timestamp,
        rawText: raw.body,
        textForAgent: raw.body,
      };
    },
    classify(input) {
      return { kind: "message", canStartAgentTurn: input.rawText.length > 0 };
    },
    async preflight(input, eventClass) {
      if (await isDuplicate(input.id)) {
        return { admission: { kind: "drop", reason: "dedupe" } };
      }
      return {};
    },
    resolveTurn(input) {
      return buildAssembledTurn(input);
    },
    onFinalize(result) {
      clearPendingGroupHistory(result);
    },
  },
});
```

`run` es la forma adecuada cuando el canal tiene una lógica de adaptador pequeña y se beneficia de poseer el ciclo de vida a través de ganchos.

### runAssembled

Úselo cuando el canal ya haya resuelto el enrutamiento, haya construido un `FinalizedMsgContext`,
y solo necesite el registro compartido, la canalización de respuesta, el despacho y el orden de
finalización. Esta es la forma preferida para rutas de entrada empaquetadas simples que
de otro modo repetirían la plantilla de `createChannelMessageReplyPipeline(...)` y
`runPrepared(...)`.

```typescript
await runtime.channel.turn.runAssembled({
  cfg,
  channel: "irc",
  accountId,
  agentId: route.agentId,
  routeSessionKey: route.sessionKey,
  storePath,
  ctxPayload,
  recordInboundSession: runtime.channel.session.recordInboundSession,
  dispatchReplyWithBufferedBlockDispatcher: runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher,
  delivery: {
    deliver: async (payload) => {
      await sendPlatformReply(payload);
    },
    onError: (err, info) => {
      runtime.error?.(`reply ${info.kind} failed: ${String(err)}`);
    },
  },
});
```

Elija `runAssembled` sobre `runPrepared` cuando el único comportamiento de despacho
propio del canal sea la entrega final de la carga útil más escritura opcional, opciones de respuesta, entrega
durable o registro de errores.

### runPrepared

Úselo cuando el canal tenga un despachador local complejo con vistas previas, reintentos, ediciones o inicio de subprocesos que debe seguir siendo propiedad del canal. El kernel todavía registra la sesión de entrada antes del despacho y expone un `DispatchedChannelTurnResult` uniforme.

```typescript
const { dispatchResult } = await runtime.channel.turn.runPrepared({
  channel: "matrix",
  accountId,
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  record: {
    onRecordError,
    updateLastRoute,
  },
  onPreDispatchFailure: async (err) => {
    await stopStatusReactions();
  },
  runDispatch: async () => {
    return await runMatrixOwnedDispatcher();
  },
});
```

Los canales ricos (Matrix, Mattermost, Microsoft Teams, Feishu, QQ Bot) usan `runPrepared` porque su despachador orquesta comportamientos específicos de la plataforma que el kernel no debe conocer.

### buildContext

Una función pura que mapea paquetes de hechos en `FinalizedMsgContext`. Úsela cuando su canal implemente manualmente parte de la canalización pero desea una forma de contexto consistente.

```typescript
const ctxPayload = runtime.channel.turn.buildContext({
  channel: "googlechat",
  accountId,
  messageId,
  timestamp,
  from,
  sender,
  conversation,
  route,
  reply,
  message,
  access,
  media,
  supplemental,
});
```

`buildContext` también es útil dentro de las devoluciones de llamada `resolveTurn` al ensamblar un turno para `run`.

<Note>Los auxiliares del SDK en desuso, como `dispatchInboundReplyWithBase`, todavía se puentean a través de un auxiliar de turno ensamblado. El código nuevo de los plugins debe usar `run` o `runPrepared`.</Note>

## Tipos de hechos

Los hechos que el núcleo consume de su adaptador son independientes de la plataforma. Traduzca los objetos de la plataforma a estas formas antes de entregarlos al núcleo.

### NormalizedTurnInput

| Campo             | Propósito                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `id`              | Id de mensaje estable usado para deduplicación y registros                                       |
| `timestamp`       | Epoch ms opcional                                                                                |
| `rawText`         | Cuerpo tal como se recibió de la plataforma                                                      |
| `textForAgent`    | Cuerpo limpio opcional para el agente (eliminación de menciones, recorte de escritura)           |
| `textForCommands` | Cuerpo opcional utilizado para el análisis `/command`                                            |
| `raw`             | Referencia de paso opcional para devoluciones de llamada del adaptador que necesitan el original |

### ChannelEventClass

| Campo                  | Propósito                                                               |
| ---------------------- | ----------------------------------------------------------------------- |
| `kind`                 | `message`, `command`, `interaction`, `reaction`, `lifecycle`, `unknown` |
| `canStartAgentTurn`    | Si es falso, el kernel devuelve `{ kind: "handled" }`                   |
| `requiresImmediateAck` | Sugerencia para adaptadores que necesitan ACK antes del despacho        |

### SenderFacts

| Campo          | Propósito                                                                             |
| -------------- | ------------------------------------------------------------------------------------- |
| `id`           | Id de remitente estable de la plataforma                                              |
| `name`         | Nombre para mostrar                                                                   |
| `username`     | Identificador si es distinto de `name`                                                |
| `tag`          | Discriminador estilo Discord o etiqueta de plataforma                                 |
| `roles`        | Ids de roles, utilizados para la coincidencia de la lista blanca de roles de miembros |
| `isBot`        | Verdadero cuando el remitente es un bot conocido (el núcleo lo usa para descartar)    |
| `isSelf`       | Verdadero cuando el remitente es el propio agente configurado                         |
| `displayLabel` | Etiqueta pre-renderizada para el texto del sobre                                      |

### ConversationFacts

| Campo             | Propósito                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `kind`            | `direct`, `group` o `channel`                                                                     |
| `id`              | Id de conversación utilizado para el enrutamiento                                                 |
| `label`           | Etiqueta humana para el sobre                                                                     |
| `spaceId`         | Identificador de espacio externo opcional (espacio de trabajo de Slack, hogar de servidor Matrix) |
| `parentId`        | Id de conversación externa cuando esto es un hilo                                                 |
| `threadId`        | Id del hilo cuando este mensaje está dentro de un hilo                                            |
| `nativeChannelId` | Id. de canal nativo de la plataforma cuando es diferente del id. de enrutamiento                  |
| `routePeer`       | Par utilizado para la búsqueda de `resolveAgentRoute`                                             |

### RouteFacts

| Campo                   | Propósito                                                                     |
| ----------------------- | ----------------------------------------------------------------------------- |
| `agentId`               | Agente que debe manejar este turno                                            |
| `accountId`             | Invalidación opcional (canales multicuenta)                                   |
| `routeSessionKey`       | Clave de sesión utilizada para el enrutamiento                                |
| `dispatchSessionKey`    | Clave de sesión utilizada en el envío cuando es diferente de la clave de ruta |
| `persistedSessionKey`   | Clave de sesión escrita en los metadatos de sesión persistidos                |
| `parentSessionKey`      | Padre para sesiones bifurcadas/en hilo                                        |
| `modelParentSessionKey` | Padre del lado del modelo para sesiones bifurcadas                            |
| `mainSessionKey`        | Pin principal del propietario del DM para conversaciones directas             |
| `createIfMissing`       | Permitir que el paso de registro cree una fila de sesión faltante             |

### ReplyPlanFacts

| Campo                     | Propósito                                                     |
| ------------------------- | ------------------------------------------------------------- |
| `to`                      | Destino de respuesta lógica escrito en el contexto `To`       |
| `originatingTo`           | Destino de contexto de origen (`OriginatingTo`)               |
| `nativeChannelId`         | Id. de canal nativo de la plataforma para la entrega          |
| `replyTarget`             | Destino final de respuesta visible si difiere de `to`         |
| `deliveryTarget`          | Invalidación de entrega de nivel inferior                     |
| `replyToId`               | Id. de mensaje citado/anclado                                 |
| `replyToIdFull`           | Id. citado en forma completa cuando la plataforma tiene ambos |
| `messageThreadId`         | Id. de hilo en el momento de la entrega                       |
| `threadParentId`          | Id. del mensaje principal del hilo                            |
| `sourceReplyDeliveryMode` | `thread`, `reply`, `channel`, `direct`, o `none`              |

### AccessFacts

`AccessFacts` lleva los booleanos que necesita la etapa de autorización. La coincidencia de identidad permanece en el canal: el kernel solo consume el resultado.

| Campo      | Propósito                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `dm`       | Decisión de permitir/emparejar/denegar DM y lista `allowFrom`                                   |
| `group`    | Política de grupo, permitir ruta, permitir remitente, lista de permitidos, requisito de mención |
| `commands` | Autorización de comandos a través de los autorizadores configurados                             |
| `mentions` | Si la detección de mención es posible y si se mencionó al agente                                |

### MessageFacts

| Campo            | Propósito                                                                     |
| ---------------- | ----------------------------------------------------------------------------- |
| `body`           | Cuerpo final del sobre (formateado)                                           |
| `rawBody`        | Cuerpo de entrada sin procesar                                                |
| `bodyForAgent`   | Cuerpo que ve el agente                                                       |
| `commandBody`    | Cuerpo utilizado para el análisis de comandos                                 |
| `envelopeFrom`   | Etiqueta de remitente prerrenderizada para el sobre                           |
| `senderLabel`    | Anulación opcional para el remitente renderizado                              |
| `preview`        | Vista previa breve redactada para registros                                   |
| `inboundHistory` | Entradas recientes del historial de entrada cuando el canal mantiene un búfer |

### SupplementalContextFacts

El contexto suplementario cubre la cita, el reenvío y el contexto de arranque de hilo. El kernel aplica la política `contextVisibility` configurada. El adaptador del canal solo proporciona hechos y marcas `senderAllowed` para que la política entre canales se mantenga constante.

### InboundMediaFacts

Los medios tienen forma de hechos. La descarga de la plataforma, la autenticación, la política SSRF, las reglas de CDN y el descifrado permanecen locales del canal. El kernel asigna los hechos a `MediaPath`, `MediaUrl`, `MediaType`, `MediaPaths`, `MediaUrls`, `MediaTypes` y `MediaTranscribedIndexes`.

Use `toInboundMediaFacts(...)` de `openclaw/plugin-sdk/channel-inbound` cuando
su canal tenga una lista de medios resuelta y solo necesite adjuntar hechos genéricos:

```typescript
media: toInboundMediaFacts(resolvedMedia, {
  kind: "image",
  messageId: input.id,
});
```

Si los medios mezclan archivos locales y entradas solo de URL, mantenga la lista como hechos de medios.
Core preserva los índices de la matriz cuando escribe los campos de contexto heredados para que la comprensión
descendente de medios, los marcadores de transcripción y las notas del prompt sigan refiriéndose
al mismo adjunto.

Para los mensajes de grupo omitidos que deben estar disponibles para una mención posterior, pase
los hechos de medios a través del campo `preflight.media` del turno. El núcleo convierte esos
hechos en entradas de medios de historial delimitadas antes de grabar:

```typescript
preflight(input) {
  return {
    admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
    media: () => toInboundMediaFacts(resolveLocalImages(input), {
      kind: "image",
      messageId: input.id,
    }),
    history: {
      key: historyKey,
      limit: historyLimit,
      mediaLimit: 4,
      shouldRecord: () => stillCurrent(input),
    },
  };
}
```

El historial de medios es intencionalmente conservador: solo imágenes hoy, solo rutas legibles
locales, delimitado por el límite de medios configurado, y aún vinculado a la
clave de historial del canal. Las URL de proveedores autenticados deben ser descargadas por el
complemento antes de que se conviertan en medios visibles para el modelo.

## Ventanas de historial

El código de turno de mensaje debe usar `createChannelHistoryWindow(...)` en lugar de
llamar a los ayudantes de mapa de bajo nivel `reply-history` directamente. Los antiguos ayudantes de mapa
permanecen importables como exportaciones de compatibilidad en desuso, pero el nuevo código de tiempo de ejecución
del complemento no debe llamarlos. La fachada de la ventana mantiene el contexto de texto, `InboundHistory`
estructurado, la normalización de medios de historial y la limpieza detrás de una
API propiedad del núcleo, mientras que aún permite que el canal elija cómo se
representa una línea de historial.

```typescript
const history = createChannelHistoryWindow({ historyMap: groupHistories });

await history.recordWithMedia({
  historyKey,
  limit: historyLimit,
  entry,
  media: () =>
    toInboundMediaFacts(resolvedImages, {
      kind: "image",
      messageId: entry.messageId,
    }),
});

const combinedBody = history.buildPendingContext({
  historyKey,
  limit: historyLimit,
  currentMessage,
  formatEntry: (entry) => `${entry.sender}: ${entry.body}`,
});
```

Las antiguas exportaciones `buildPendingHistoryContextFromMap`,
`buildInboundHistoryFromMap`, `recordPendingHistoryEntry*` y
`clearHistoryEntries*` permanecen como compatibilidad en desuso para complementos
que aún no han migrado. El nuevo trabajo de canal debe usar la ventana o las opciones
de grabación/finalización del núcleo de turno.

## Patrones de mensajes comunes

Grupo de solo texto con mención requerida:

```typescript
preflight(input) {
  const decision = resolveInboundMentionDecision({ facts, policy });
  if (decision.shouldSkip) {
    return {
      admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
      history: { key: historyKey, limit: historyLimit },
    };
  }
  return { access: { mentions: decision } };
}
```

Mensaje de solo imagen seguido de una mención posterior:

```typescript
preflight(input) {
  if (!wasMentioned && resolvedImages.length > 0) {
    return {
      admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
      media: () => toInboundMediaFacts(resolvedImages, {
        kind: "image",
        messageId: input.id,
      }),
      history: { key: historyKey, limit: historyLimit, mediaLimit: 4 },
    };
  }
  return {};
}
```

Respuesta explícita a imagen:

```typescript
resolveTurn(input, _eventClass, preflight) {
  return {
    ...assembled,
    media: toInboundMediaFacts([...currentMedia, ...referencedReplyMedia]),
    supplemental: {
      quote: preflight.supplemental?.quote,
    },
  };
}
```

Mensaje directo con historial:

```typescript
resolveTurn(input) {
  return {
    ...assembled,
    history: undefined,
    message: {
      rawBody: input.rawText,
      bodyForAgent: input.textForAgent,
    },
  };
}
```

## Contrato del adaptador

Para `run` completo, la forma del adaptador es:

```typescript
type ChannelTurnAdapter<TRaw> = {
  ingest(raw: TRaw): Promise<NormalizedTurnInput | null> | NormalizedTurnInput | null;
  classify?(input: NormalizedTurnInput): Promise<ChannelEventClass> | ChannelEventClass;
  preflight?(input: NormalizedTurnInput, eventClass: ChannelEventClass): Promise<PreflightFacts | ChannelTurnAdmission | null | undefined>;
  resolveTurn(input: NormalizedTurnInput, eventClass: ChannelEventClass, preflight: PreflightFacts): Promise<ChannelTurnResolved> | ChannelTurnResolved;
  onFinalize?(result: ChannelTurnResult): Promise<void> | void;
};
```

`resolveTurn` devuelve un `ChannelTurnResolved`, que es un `AssembledChannelTurn` con un tipo de admisión opcional. Devolver `{ admission: { kind: "observeOnly" } }` ejecuta el turno sin producir salida visible. El adaptador sigue siendo dueño de la devolución de llamada de entrega; simplemente se convierte en una no-op para ese turno.

`onFinalize` se ejecuta en cada resultado, incluidos los errores de envío. Úselo para borrar el historial de grupos pendientes, eliminar las reacciones de reconocimiento, detener los indicadores de estado y vaciar el estado local.

## Adaptador de entrega

El núcleo no llama a la plataforma directamente. El canal entrega al núcleo un `ChannelEventDeliveryAdapter`:

```typescript
type ChannelEventDeliveryAdapter = {
  deliver(payload: ReplyPayload, info: ChannelDeliveryInfo): Promise<ChannelDeliveryResult | void>;
  onError?(err: unknown, info: { kind: string }): void;
  durable?: false | DurableInboundReplyDeliveryOptions;
};

type ChannelDeliveryResult = {
  messageIds?: string[];
  receipt?: MessageReceipt;
  threadId?: string;
  replyToId?: string;
  visibleReplySent?: boolean;
};
```

`deliver` se llama una vez por cada fragmento de respuesta almacenado en búfer. Durante la migración del ciclo de vida del mensaje, la entrega de eventos de canal ensamblados es propiedad del canal de forma predeterminada: un campo `durable` omitido significa que el núcleo debe llamar a `deliver` directamente y no debe enrutar a través de la entrega genérica de salida. Establezca `durable` solo después de que el canal haya sido auditado para demostrar que la ruta de envío genérica conserva el comportamiento de entrega anterior, incluidos los objetivos de respuesta/hilo, el manejo de medios, los cachés de mensajes enviados/eco propio, la limpieza de estado y los IDs de mensajes devueltos. `durable: false` sigue siendo una ortografía de compatibilidad para "usar la devolución de llamada propia del canal", pero los canales no migrados no deberían necesitar agregarla. Devuelva los IDs de mensajes de la plataforma cuando el canal los tenga para que el despachador pueda conservar los anclajes de hilo y editar fragmentos posteriores; las rutas de entrega más nuevas también deben devolver `receipt` para que la recuperación, la finalización de vista previa y la supresión de duplicados puedan abandonar `messageIds`. Para turnos de solo observación, devuelva `{ visibleReplySent: false }` o use `createNoopChannelEventDeliveryAdapter()`.

Los canales que usan `runPrepared` con un despachador totalmente propiedad del canal no tienen un `ChannelEventDeliveryAdapter`. Esos despachadores no son duraderos de forma predeterminada. Deben mantener su ruta de entrega directa hasta que se acepten explícitamente al nuevo contexto de envío con un objetivo completo, un adaptador seguro para repetición, un contrato de recibo y ganchos de efectos secundarios del canal.

Los asistentes de compatibilidad pública como `recordInboundSessionAndDispatchReply`, `dispatchInboundReplyWithBase` y los asistentes de MD directos deben mantener el comportamiento durante la migración. No deben llamar a la entrega duradera genérica antes de las devoluciones de llamada `deliver` o `reply` propiedad de la persona que llama.

## Opciones de registro

La etapa de registro envuelve `recordInboundSession`. La mayoría de los canales pueden usar los valores predeterminados. Anular mediante `record`:

```typescript
record: {
  groupResolution,
  createIfMissing: true,
  updateLastRoute,
  onRecordError: (err) => log.warn("record failed", err),
  trackSessionMetaTask: (task) => pendingTasks.push(task),
}
```

El despachador espera a la etapa de registro. Si el registro arroja un error, el kernel ejecuta `onPreDispatchFailure` (cuando se proporciona a `runPrepared`) y vuelve a lanzar el error.

## Observabilidad

Cada etapa emite un evento estructurado cuando se suministra una devolución de llamada `log`:

```typescript
await runtime.channel.turn.run({
  channel: "twitch",
  accountId,
  raw,
  adapter,
  log: (event) => {
    runtime.log?.debug?.(`turn.${event.stage}:${event.event}`, {
      channel: event.channel,
      accountId: event.accountId,
      messageId: event.messageId,
      sessionKey: event.sessionKey,
      admission: event.admission,
      reason: event.reason,
    });
  },
});
```

Etapas registradas: `ingest`, `classify`, `preflight`, `resolve`, `authorize`, `assemble`, `record`, `dispatch`, `finalize`. Evite registrar cuerpos sin procesar; use `MessageFacts.preview` para obtener vistas previas redactadas cortas.

## Lo que permanece local del canal

El kernel es propietario de la orquestación. El canal sigue siendo propietario de:

- Transportes de plataforma (puerta de enlace, REST, websocket, sondeo, webhooks)
- Resolución de identidad y coincidencia de nombres para mostrar
- Comandos nativos, comandos de barra, autocompletado, modales, botones, estado de voz
- Renderizado de tarjetas, modales y tarjetas adaptables
- Autenticación de medios, reglas de CDN, medios cifrados, transcripción
- APIs de edición, reacción, redacción y presencia
- Relleno y obtención del historial del lado de la plataforma
- Flujos de emparejamiento que requieren verificación específica de la plataforma

Si dos canales comienzan a necesitar el mismo ayudante para uno de estos, extraiga un ayudante compartido del SDK en lugar de insertarlo en el kernel.

## Estabilidad

`runtime.channel.turn.*` es parte de la superficie pública del tiempo de ejecución del complemento. Los tipos de datos (`SenderFacts`, `ConversationFacts`, `RouteFacts`, `ReplyPlanFacts`, `AccessFacts`, `MessageFacts`, `SupplementalContextFacts`, `InboundMediaFacts`) y las formas de admisión (`ChannelTurnAdmission`, `ChannelEventClass`) son accesibles a través de `PluginRuntime` desde `openclaw/plugin-sdk/core`.

Se aplican las reglas de compatibilidad con versiones anteriores: los nuevos campos de hechos son aditivos, los tipos de admisión no se cambian de nombre y los nombres de los puntos de entrada se mantienen estables. Las necesidades de nuevos canales que requieran un cambio no aditivo deben pasar por el proceso de migración del SDK del complemento.

## Relacionado

- [Refactorización del ciclo de vida de los mensajes](/es/concepts/message-lifecycle-refactor) para el ciclo de vida de envío/recepción/en vivo planificado que envolverá este kernel
- [Construcción de complementos de canal](/es/plugins/sdk-channel-plugins) para el contrato más amplio de complementos de canal
- [Auxiliares del runtime de complementos](/es/plugins/sdk-runtime) para otras superficies `runtime.*`
- [Aspectos internos de los complementos](/es/plugins/architecture-internals) para la canalización de carga y la mecánica del registro
