---
summary: "runtime.channel.turn: el núcleo compartido de turnos de entrada que utilizan los complementos de canal integrados y de terceros para registrar, despachar y finalizar turnos de agente"
title: "Núcleo de turnos de canal"
sidebarTitle: "Turno de canal"
read_when:
  - You are building a channel plugin and want the shared inbound turn lifecycle
  - You are migrating a channel monitor off hand-rolled record/dispatch glue
  - You need to understand admission, ingest, classify, preflight, resolve, record, dispatch, and finalize stages
---

El núcleo de turnos de canal es la máquina de estado de entrada compartida que convierte un evento de plataforma normalizado en un turno de agente. Los complementos de canal proporcionan los datos de la plataforma y la devolución de llamada de entrega. Core posee la orquestación: ingestión, clasificación, preverificación, resolución, autorización, ensamblaje, registro, despacho y finalización.

Use esto cuando su complemento esté en la ruta de acceso rápida de mensajes entrantes. Para eventos que no son mensajes (comandos de barra, modales, interacciones de botones, eventos de ciclo de vida, reacciones, estado de voz), manténgalos localmente en el complemento. El núcleo solo posee eventos que pueden convertirse en un turno de texto de agente.

<Info>Se accede al núcleo a través del tiempo de ejecución del complemento inyectado como `runtime.channel.turn.*`. El tipo de tiempo de ejecución del complemento se exporta desde `openclaw/plugin-sdk/core`, por lo que los complementos nativos de terceros pueden usar estos puntos de entrada de la misma manera que los complementos de canal integrados.</Info>

## Por qué un núcleo compartido

Los complementos de canal repiten el mismo flujo de entrada: normalizar, enrutar, filtrar, construir un contexto, registrar metadatos de sesión, despachar el turno de agente y finalizar el estado de entrega. Sin un núcleo compartido, un cambio en el filtrado de menciones, respuestas visibles solo para herramientas, metadatos de sesión, historial pendiente o finalización del despacho debe aplicarse por canal.

El núcleo mantiene deliberadamente separados cuatro conceptos:

- `ConversationFacts`: de dónde provino el mensaje
- `RouteFacts`: qué agente y sesión deben procesarlo
- `ReplyPlanFacts`: a dónde deben ir las respuestas visibles
- `MessageFacts`: qué cuerpo y contexto complementario debe ver el agente

Los mensajes directos de Slack, los temas de Telegram, los hilos de Matrix y las sesiones de temas de Feishu los distinguen en la práctica. Tratarlos como un solo identificador causa desviaciones con el tiempo.

## Ciclo de vida de la etapa

El núcleo ejecuta la misma canalización fija independientemente del canal:

1. `ingest` -- el adaptador convierte un evento de plataforma sin procesar en `NormalizedTurnInput`
2. `classify` -- el adaptador declara si este evento puede iniciar un turno de agente
3. `preflight` -- el adaptador realiza deduplicación, eco propio, hidratación, antirrebote, descifrado, relleno previo parcial de hechos
4. `resolve` -- el adaptador devuelve un turno totalmente ensamblado (ruta, plan de respuesta, mensaje, entrega)
5. `authorize` -- se aplican políticas de MD, grupo, mención y comando a los hechos ensamblados
6. `assemble` -- `FinalizedMsgContext` construido a partir de los hechos mediante `buildContext`
7. `record` -- metadatos de la sesión entrante y última ruta persistidos
8. `dispatch` -- turno de agente ejecutado a través del despachador de bloques en búfer
9. `finalize` -- el `onFinalize` del adaptador se ejecuta incluso en caso de error de despacho

Cada etapa emite un evento de registro estructurado cuando se suministra una devolución de llamada `log`. Consulte [Observabilidad](#observability).

## Tipos de admisión

El núcleo no genera excepciones cuando un turno está cerrado. Devuelve un `ChannelTurnAdmission`:

| Tipo          | Cuándo                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispatch`    | El turno es admitido. Se ejecuta el turno del agente y se ejerce la ruta de respuesta visible.                                                                                      |
| `observeOnly` | El turno se ejecuta de extremo a extremo, pero el adaptador de entrega no envía nada visible. Se utiliza para agentes de observador de difusión y otros flujos multiagente pasivos. |
| `handled`     | Un evento de plataforma se consumió localmente (ciclo de vida, reacción, botón, modal). El núcleo omite el despacho.                                                                |
| `drop`        | Ruta de omisión. Opcionalmente, `recordHistory: true` mantiene el mensaje en el historial del grupo pendiente para que una mención futura tenga contexto.                           |

La admisión puede provenir de `classify` (la clase de evento dijo que no puede iniciar un turno), de `preflight` (deduplicación, eco propio, mención faltante con registro de historial) o del propio `resolveTurn`.

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

Úselo cuando su canal pueda expresar su flujo de entrada como un `ChannelTurnAdapter<TRaw>`. El adaptador tiene devoluciones de llamada para `ingest`, opcional `classify`, opcional `preflight`, obligatorio `resolveTurn` y opcional `onFinalize`.

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

`run` es la forma correcta cuando el canal tiene una lógica de adaptador pequeña y se beneficia de poseer el ciclo de vida a través de ganchos.

### runAssembled

Úselo cuando el canal ya haya resuelto el enrutamiento, ha construido un %%PH:INLINE_CODE:53:354ba8f%%,
y solo necesita el ordenamiento compartido de registro, canalización de respuesta, envío y finalización.
Esta es la forma preferida para rutas de entrada agrupadas simples que
de otro modo repetirían el código repetitivo de `FinalizedMsgContext``createChannelMessageReplyPipeline(...)` y
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

Elija `runAssembled` en lugar de `runPrepared` cuando el único comportamiento de despacho propiedad del canal sea la entrega final de la carga útil más escritura opcional, opciones de respuesta, entrega duradera o registro de errores.

### runPrepared

Úselo cuando el canal tenga un despachador local complejo con vistas previas, reintentos, ediciones o inicialización de hilos que deban seguir siendo propiedad del canal. El núcleo todavía registra la sesión entrantes antes del despacho y expone un `DispatchedChannelTurnResult` uniforme.

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

Los canales ricos (Matrix, Mattermost, Microsoft Teams, Feishu, QQ Bot) usan `runPrepared` porque su despachador orquesta comportamientos específicos de la plataforma que el núcleo no debe conocer.

### buildContext

Una función pura que asigna paquetes de hechos a `FinalizedMsgContext`. Úsela cuando su canal implemente manualmente parte de la canalización pero desea una forma de contexto consistente.

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

<Note>Los ayudantes del SDK obsoletos, como `dispatchInboundReplyWithBase`, todavía pasan a través de un ayudante de turno ensamblado. El nuevo código de complemento debería usar `run` o `runPrepared`.</Note>

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
| `canStartAgentTurn`    | Si es falso, el núcleo devuelve `{ kind: "handled" }`                   |
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
| `kind`            | `direct`, `group`, o `channel`                                                                    |
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
| `originatingTo`           | Destino del contexto de origen (`OriginatingTo`)              |
| `nativeChannelId`         | Id. de canal nativo de la plataforma para la entrega          |
| `replyTarget`             | Destino final de respuesta visible si difiere de `to`         |
| `deliveryTarget`          | Invalidación de entrega de nivel inferior                     |
| `replyToId`               | Id. de mensaje citado/anclado                                 |
| `replyToIdFull`           | Id. citado en forma completa cuando la plataforma tiene ambos |
| `messageThreadId`         | Id. de hilo en el momento de la entrega                       |
| `threadParentId`          | Id. del mensaje principal del hilo                            |
| `sourceReplyDeliveryMode` | `thread`, `reply`, `channel`, `direct` o `none`               |

### AccessFacts

`AccessFacts` lleva los booleanos que la etapa de autorización necesita. La coincidencia de identidades permanece en el canal: el kernel solo consume el resultado.

| Campo      | Propósito                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `dm`       | Decisión de permitir/emparejar/denegar DM y lista de `allowFrom`                                |
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

El contexto suplementario cubre el contexto de cita, reenvío e inicio de hilo. El núcleo aplica la política `contextVisibility` configurada. El adaptador del canal solo proporciona hechos y banderas `senderAllowed` para que la política entre canales se mantenga coherente.

### InboundMediaFacts

Los medios tienen forma de hechos. La descarga de la plataforma, la autenticación, la política SSRF, las reglas de CDN y el descifrado permanecen locales del canal. El núcleo asigna los hechos a `MediaPath`, `MediaUrl`, `MediaType`, `MediaPaths`, `MediaUrls`, `MediaTypes` y `MediaTranscribedIndexes`.

## Contrato del adaptador

Para el `run` completo, la forma del adaptador es:

```typescript
type ChannelTurnAdapter<TRaw> = {
  ingest(raw: TRaw): Promise<NormalizedTurnInput | null> | NormalizedTurnInput | null;
  classify?(input: NormalizedTurnInput): Promise<ChannelEventClass> | ChannelEventClass;
  preflight?(input: NormalizedTurnInput, eventClass: ChannelEventClass): Promise<PreflightFacts | ChannelTurnAdmission | null | undefined>;
  resolveTurn(input: NormalizedTurnInput, eventClass: ChannelEventClass, preflight: PreflightFacts): Promise<ChannelTurnResolved> | ChannelTurnResolved;
  onFinalize?(result: ChannelTurnResult): Promise<void> | void;
};
```

`resolveTurn` devuelve un `ChannelTurnResolved`, que es un `AssembledChannelTurn` con un tipo de admisión opcional. Devolver `{ admission: { kind: "observeOnly" } }` ejecuta el turno sin producir una salida visible. El adaptador sigue siendo propietario de la devolución de llamada de entrega; simplemente se convierte en una operación nula para ese turno.

`onFinalize` se ejecuta en cada resultado, incluidos los errores de envío. Úselo para borrar el historial de grupos pendientes, eliminar reacciones de reconocimiento, detener los indicadores de estado y vaciar el estado local.

## Adaptador de entrega

El núcleo no llama a la plataforma directamente. El canal le entrega al núcleo un `ChannelTurnDeliveryAdapter`:

```typescript
type ChannelTurnDeliveryAdapter = {
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

`deliver` se llama una vez por fragmento de respuesta almacenado en búfer. Durante la migración del ciclo de vida de los mensajes, la entrega de turnos de canal ensamblados es propiedad del canal de forma predeterminada: un campo `durable` omitido significa que el núcleo debe llamar a `deliver` directamente y no debe enrutar a través de la entrega genérica de salida. Establezca `durable` solo después de que el canal haya sido auditado para demostrar que la ruta de envío genérica preserva el comportamiento de entrega antiguo, incluidos los objetivos de respuesta/hilo, el manejo de medios, las cachés de mensajes enviados/eco propio, la limpieza de estado y los ids de mensajes devueltos. `durable: false` sigue siendo una ortografía de compatibilidad para "usar la devolución de llamada propiedad del canal", pero los canales no migrados no deberían necesitar agregarla. Devuelva los ids de mensajes de la plataforma cuando el canal los tenga para que el despachador pueda preservar los anclajes de hilo y editar fragmentos posteriores; las rutas de entrega más nuevas también deberían devolver `receipt` para que la recuperación, la finalización de vista previa y la supresión de duplicados puedan salir de `messageIds`. Para turnos de solo observación, devuelva `{ visibleReplySent: false }` o use `createNoopChannelTurnDeliveryAdapter()`.

Los canales que usan `runPrepared` con un despachador totalmente propiedad del canal no tienen un `ChannelTurnDeliveryAdapter`. Esos despachadores no son duraderos por defecto. Deben mantener su ruta de entrega directa hasta que acepten explícitamente el nuevo contexto de envío con un objetivo completo, un adaptador seguro para repetición, un contrato de recibo y ganchos de efectos secundarios del canal.

Los ayudantes de compatibilidad pública como `recordInboundSessionAndDispatchReply`, `dispatchInboundReplyWithBase` y los ayudantes de MD directo deben mantener el comportamiento preservador durante la migración. No deben llamar a la entrega duradera genérica antes de las devoluciones de llamada `deliver` o `reply` propiedad de la persona que llama.

## Opciones de registro

La etapa de registro envuelve `recordInboundSession`. La mayoría de los canales pueden usar los valores predeterminados. Anular a través de `record`:

```typescript
record: {
  groupResolution,
  createIfMissing: true,
  updateLastRoute,
  onRecordError: (err) => log.warn("record failed", err),
  trackSessionMetaTask: (task) => pendingTasks.push(task),
}
```

El despachador espera a la etapa de registro. Si el registro falla, el núcleo ejecuta `onPreDispatchFailure` (cuando se proporciona a `runPrepared`) y vuelve a lanzar el error.

## Observabilidad

Cada etapa emite un evento estructurado cuando se suministra una función de devolución de llamada `log`:

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

Etapas registradas: `ingest`, `classify`, `preflight`, `resolve`, `authorize`, `assemble`, `record`, `dispatch`, `finalize`. Evite registrar cuerpos sin procesar; use `MessageFacts.preview` para obtener vistas previas redactadas breves.

## Lo que permanece local del canal

El núcleo posee la orquestación. El canal todavía posee:

- Transportes de plataforma (puerta de enlace, REST, websocket, sondeo, webhooks)
- Resolución de identidad y coincidencia de nombres para mostrar
- Comandos nativos, comandos de barra, autocompletado, modales, botones, estado de voz
- Representación de tarjetas, modales y tarjetas adaptables
- Autenticación de medios, reglas de CDN, medios cifrados, transcripción
- APIs de edición, reacción, supresión y presencia
- Relleno y obtención del historial del lado de la plataforma
- Flujos de emparejamiento que requieren verificación específica de la plataforma

Si dos canales comienzan a necesitar el mismo asistente para uno de estos, extraiga un asistente compartido del SDK en lugar de insertarlo en el núcleo.

## Estabilidad

`runtime.channel.turn.*` es parte de la superficie pública del tiempo de ejecución del complemento. Los tipos de datos (`SenderFacts`, `ConversationFacts`, `RouteFacts`, `ReplyPlanFacts`, `AccessFacts`, `MessageFacts`, `SupplementalContextFacts`, `InboundMediaFacts`) y las formas de admisión (`ChannelTurnAdmission`, `ChannelEventClass`) son accesibles a través de `PluginRuntime` desde `openclaw/plugin-sdk/core`.

Se aplican las reglas de compatibilidad con versiones anteriores: los nuevos campos de datos son aditivos, los tipos de admisión no se renombran y los nombres de los puntos de entrada se mantienen estables. Las nuevas necesidades del canal que requieran un cambio no aditivo deben pasar por el proceso de migración del SDK del complemento.

## Relacionado

- [Refactorización del ciclo de vida de los mensajes](/es/concepts/message-lifecycle-refactor) para el ciclo de vida planificado de envío/recepción/en vivo que envolverá este núcleo
- [Construcción de complementos de canal](/es/plugins/sdk-channel-plugins) para el contrato más amplio de complementos de canal
- [Auxiliares de tiempo de ejecución de complementos](/es/plugins/sdk-runtime) para otras superficies `runtime.*`
- [Aspectos internos de los complementos](/es/plugins/architecture-internals) para la canalización de carga y la mecánica del registro
