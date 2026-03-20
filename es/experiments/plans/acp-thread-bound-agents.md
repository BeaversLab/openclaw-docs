---
summary: "Integrar los agentes de codificación ACP a través de un plano de control ACP de primera clase en runtimes principales y respaldados por plugins (acpx primero)"
owner: "onutc"
status: "draft"
last_updated: "2026-02-25"
title: "Agentes ACP vinculados a hilos"
---

# Agentes ACP vinculados a hilos

## Visión general

Este plan define cómo OpenClaw debe soportar agentes de codificación ACP en canales con capacidad de hilos (Discord primero) con ciclo de vida y recuperación de nivel de producción.

Documento relacionado:

- [Plan de refactorización de transmisión unificada de runtime](/es/experiments/plans/acp-unified-streaming-refactor)

Experiencia de usuario objetivo:

- un usuario genera o enfoca una sesión ACP en un hilo
- los mensajes de usuario en ese hilo se enrutan a la sesión ACP vinculada
- la salida del agente se transmite de vuelta a la misma personalidad del hilo
- la sesión puede ser persistente o de un solo uso con controles explícitos de limpieza

## Resumen de la decisión

La recomendación a largo plazo es una arquitectura híbrida:

- OpenClaw core posee las preocupaciones del plano de control ACP
  - identidad y metadatos de la sesión
  - vinculación de hilos y decisiones de enrutamiento
  - invariantes de entrega y supresión de duplicados
  - semántica de limpieza y recuperación del ciclo de vida
- el backend del runtime ACP es conectable (pluggable)
  - el primer backend es un servicio de plugin respaldado por acpx
  - el runtime realiza el transporte, puesta en cola, cancelación y reconexión de ACP

OpenClaw no debe reimplementar los internos de transporte de ACP en el core.
OpenClaw no debe depender de una ruta de interceptación puramente basada en plugins para el enrutamiento.

## Arquitectura estelar (santo grial)

Tratar ACP como un plano de control de primera clase en OpenClaw, con adaptadores de runtime conectables.

Invariantes innegociables:

- cada vinculación de hilo ACP referencia un registro de sesión ACP válido
- cada sesión ACP tiene un estado explícito del ciclo de vida (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- cada ejecución ACP tiene un estado explícito de ejecución (`queued`, `running`, `completed`, `failed`, `cancelled`)
- la generación, vinculación y puesta en cola inicial son atómicas
- los reintentos de comandos son idempotentes (sin ejecuciones duplicadas ni salidas duplicadas en Discord)
- la salida del canal de hilo vinculado es una proyección de eventos de ejecución ACP, nunca efectos secundarios ad-hoc

Modelo de propiedad a largo plazo:

- `AcpSessionManager` es el único escritor y orquestador de ACP
- el gestor reside primero en el proceso de la puerta de enlace; se puede mover a un sidecar dedicado más tarde detrás de la misma interfaz
- por clave de sesión ACP, el gestor posee un actor en memoria (ejecución de comandos serializada)
- los adaptadores (`acpx`, futuros backends) son solo implementaciones de transporte/runtime

Modelo de persistencia a largo plazo:

- mover el estado del plano de control de ACP a un almacenamiento SQLite dedicado (modo WAL) bajo el directorio de estado de OpenClaw
- mantener `SessionEntry.acp` como proyección de compatibilidad durante la migración, no como fuente de verdad
- almacenar eventos ACP de solo anexado para admitir la reproducción, la recuperación de fallas y la entrega determinista

### Estrategia de entrega (puente al santo grial)

- puente a corto plazo
  - mantener la mecánica actual de vinculación de hilos y la superficie de configuración ACP existente
  - corregir los errores de brecha de metadatos y enrutar los turnos de ACP a través de una única rama central de ACP
  - agregar claves de idempotencia y verificaciones de enrutamiento de cierre por falla inmediatamente
- cambio a largo plazo
  - mover la fuente de verdad de ACP a la base de datos del plano de control + actores
  - hacer que la entrega de hilos vinculados sea puramente basada en proyección de eventos
  - eliminar el comportamiento alternativo heredado que depende de metadatos de entrada de sesión oportunistas

## ¿Por qué no solo un complemento puro?

Los ganchos de complemento actuales no son suficientes para el enrutamiento de sesiones ACP de extremo a extremo sin cambios en el núcleo.

- el enrutamiento entrante desde la vinculación de hilos se resuelve en una clave de sesión en el despacho central primero
- los ganchos de mensajes son de disparar y olvidar y no pueden cortocircuitar la ruta de respuesta principal
- los comandos de complemento son buenos para las operaciones de control, pero no para reemplazar el flujo de despacho por turno del núcleo

Resultado:

- el runtime de ACP se puede convertir en complemento
- la rama de enrutamiento de ACP debe existir en el núcleo

## Fundación existente para reutilizar

Ya implementado y debe permanecer como canónico:

- el objetivo de vinculación de hilos soporta `subagent` y `acp`
- la anulación del enrutamiento de hilos entrantes se resuelve mediante vinculación antes del despacho normal
- identidad de hilos salientes a través de webhook en la entrega de respuestas
- flujo `/focus` y `/unfocus` con compatibilidad de destino ACP
- almacenamiento de vinculación persistente con restauración al inicio
- ciclo de vida de desvinculación en archivar, eliminar, perder el foco, restablecer y eliminar

Este plan amplía esa fundación en lugar de reemplazarla.

## Arquitectura

### Modelo de límites

Core (debe estar en el núcleo de OpenClaw):

- rama de despacho en modo de sesión ACP en la canalización de respuesta
- árbitro de entrega para evitar la duplicación de padre más hilo
- persistencia del plano de control de ACP (con proyección de compatibilidad `SessionEntry.acp` durante la migración)
- semántica de desvinculación del ciclo de vida y desconexión del tiempo de ejecución vinculada al restablecimiento/eliminación de la sesión

Backend de complemento (implementación acpx):

- supervisión del trabajador de tiempo de ejecución de ACP
- invocación de proceso acpx y análisis de eventos
- controladores de comandos ACP (`/acp ...`) y experiencia de usuario del operador
- configuración predeterminada y diagnósticos específicos del backend

### Modelo de propiedad del tiempo de ejecución

- un proceso de puerta de enlace es propietario del estado de orquestación de ACP
- la ejecución de ACP se ejecuta en procesos secundarios supervisados a través del backend acpx
- la estrategia de proceso es de larga duración por clave de sesión ACP activa, no por mensaje

Esto evita el costo de inicio en cada indicación y mantiene confiables las semánticas de cancelación y reconexión.

### Contrato del tiempo de ejecución principal

Agregue un contrato de tiempo de ejecución ACP principal para que el código de enrutamiento no dependa de los detalles de la CLI y pueda cambiar de backends sin cambiar la lógica de despacho:

```ts
export type AcpRuntimePromptMode = "prompt" | "steer";

export type AcpRuntimeHandle = {
  sessionKey: string;
  backend: string;
  runtimeSessionName: string;
};

export type AcpRuntimeEvent =
  | { type: "text_delta"; stream: "output" | "thought"; text: string }
  | { type: "tool_call"; name: string; argumentsText: string }
  | { type: "done"; usage?: Record<string, number> }
  | { type: "error"; code: string; message: string; retryable?: boolean };

export interface AcpRuntime {
  ensureSession(input: {
    sessionKey: string;
    agent: string;
    mode: "persistent" | "oneshot";
    cwd?: string;
    env?: Record<string, string>;
    idempotencyKey: string;
  }): Promise<AcpRuntimeHandle>;

  submit(input: {
    handle: AcpRuntimeHandle;
    text: string;
    mode: AcpRuntimePromptMode;
    idempotencyKey: string;
  }): Promise<{ runtimeRunId: string }>;

  stream(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId: string;
    onEvent: (event: AcpRuntimeEvent) => Promise<void> | void;
    signal?: AbortSignal;
  }): Promise<void>;

  cancel(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId?: string;
    reason?: string;
    idempotencyKey: string;
  }): Promise<void>;

  close(input: { handle: AcpRuntimeHandle; reason: string; idempotencyKey: string }): Promise<void>;

  health?(): Promise<{ ok: boolean; details?: string }>;
}
```

Detalle de implementación:

- primer backend: `AcpxRuntime` enviado como servicio de complemento
- el núcleo resuelve el tiempo de ejecución a través del registro y falla con un error explícito del operador cuando no hay ningún backend de tiempo de ejecución de ACP disponible

### Modelo de datos y persistencia del plano de control

La fuente de verdad a largo plazo es una base de datos ACP SQLite dedicada (modo WAL), para actualizaciones transaccionales y recuperación segura contra fallos:

- `acp_sessions`
  - `session_key` (pk), `backend`, `agent`, `mode`, `cwd`, `state`, `created_at`, `updated_at`, `last_error`
- `acp_runs`
  - `run_id` (pk), `session_key` (fk), `state`, `requester_message_id`, `idempotency_key`, `started_at`, `ended_at`, `error_code`, `error_message`
- `acp_bindings`
  - `binding_key` (pk), `thread_id`, `channel_id`, `account_id`, `session_key` (fk), `expires_at`, `bound_at`
- `acp_events`
  - `event_id` (pk), `run_id` (fk), `seq`, `kind`, `payload_json`, `created_at`
- `acp_delivery_checkpoint`
  - `run_id` (pk/fk), `last_event_seq`, `last_discord_message_id`, `updated_at`
- `acp_idempotency`
  - `scope`, `idempotency_key`, `result_json`, `created_at`, `(scope, idempotency_key)` único

```ts
export type AcpSessionMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

Reglas de almacenamiento:

- mantener `SessionEntry.acp` como una proyección de compatibilidad durante la migración
- los ids de proceso y los sockets permanecen solo en memoria
- el ciclo de vida duradero y el estado de ejecución residen en la base de datos ACP, no en el JSON de sesión genérico
- si el propietario del tiempo de ejecución muere, la puerta de enlace se rehidrata desde la base de datos ACP y se reanuda desde los puntos de control

### Enrutamiento y entrega

Entrante:

- mantener la búsqueda de enlace de subproceso actual como primer paso de enrutamiento
- si el destino vinculado es una sesión ACP, enrutar a la rama del tiempo de ejecución ACP en lugar de `getReplyFromConfig`
- el comando `/acp steer` explícito usa `mode: "steer"`

Saliente:

- el flujo de eventos de ACP se normaliza en fragmentos de respuesta de OpenClaw
- el destino de entrega se resuelve a través de la ruta de destino vinculada existente
- cuando un subproceso vinculado está activo para ese turno de sesión, se suprime la finalización del canal principal

Política de transmisión:

- transmitir salida parcial con ventana de coalescencia
- intervalo mínimo y bytes de fragmento máximos configurables para mantenerse por debajo de los límites de tasa de Discord
- el mensaje final siempre se emite al completar o fallar

### Máquinas de estado y límites de transacción

Máquina de estado de sesión:

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

Máquina de estado de ejecución:

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

Límites de transacción requeridos:

- transacción de generación (spawn)
  - crear fila de sesión ACP
  - crear/actualizar fila de enlace de hilo ACP
  - poner en cola la fila de ejecución inicial
- cerrar transacción
  - marcar sesión como cerrada
  - eliminar/expirar filas de enlace
  - escribir evento de cierre final
- cancelar transacción
  - marcar ejecución objetivo como cancelando/cancelada con clave de idempotencia

No se permite el éxito parcial a través de estos límites.

### Modelo de actor por sesión

`AcpSessionManager` ejecuta un actor por clave de sesión ACP:

- el buzón del actor serializa los efectos secundarios de `submit`, `cancel`, `close` y `stream`
- el actor posee la hidratación del identificador de tiempo de ejecución y el ciclo de vida del proceso del adaptador de tiempo de ejecución para esa sesión
- el actor escribe eventos de ejecución en orden (`seq`) antes de cualquier entrega a Discord
- el actor actualiza los puntos de control de entrega después de un envío saliente exitoso

Esto elimina las carreras entre turnos y evita la salida de hilo duplicada o fuera de orden.

### Idempotencia y proyección de entrega

Todas las acciones externas de ACP deben llevar claves de idempotencia:

- clave de idempotencia de generación (spawn)
- clave de idempotencia de prompt/steer
- clave de idempotencia de cancelación
- clave de idempotencia de cierre

Reglas de entrega:

- Los mensajes de Discord se derivan de `acp_events` más `acp_delivery_checkpoint`
- los reintentos se reanudan desde el punto de control sin reenviar los fragmentos ya entregados
- la emisión de la respuesta final es exactamente una vez por ejecución desde la lógica de proyección

### Recuperación y auto-curación

Al iniciar la puerta de enlace (gateway):

- cargar sesiones ACP no terminales (`creating`, `idle`, `running`, `cancelling`, `error`)
- recrear actores de forma perezosa en el primer evento entrante o de forma anticipada bajo el límite configurado
- conciliar cualquier ejecución `running` que falten latidos y marcar `failed` o recuperar a través del adaptador

Al recibir un mensaje de hilo de Discord entrante:

- si existe el enlace pero falta la sesión ACP, fallar cerrado con un mensaje explícito de enlace obsoleto
- opcionalmente desvincular automáticamente el enlace obsoleto después de la validación segura para el operador
- nunca enrutar silenciosamente enlaces ACP obsoletos a la ruta LLM normal

### Ciclo de vida y seguridad

Operaciones compatibles:

- cancelar ejecución actual: `/acp cancel`
- desvincular hilo: `/unfocus`
- cerrar sesión ACP: `/acp close`
- cerrar automáticamente las sesiones inactivas por TTL efectivo

política de TTL:

- el TTL efectivo es el mínimo de
  - TTL global/de sesión
  - TTL de vinculación del hilo de Discord
  - TTL del propietario del runtime ACP

Controles de seguridad:

- lista de permitidos de agentes ACP por nombre
- restringir las raíces del espacio de trabajo para las sesiones ACP
- passthrough de lista de permitidos de entorno
- máximo de sesiones ACP concurrentes por cuenta y globalmente
- retroceso de reinicio limitado para fallos del runtime

## Superficie de configuración

Claves principales:

- `acp.enabled`
- `acp.dispatch.enabled` (interruptor de apagado independiente de enrutamiento ACP)
- `acp.backend` (predeterminado `acpx`)
- `acp.defaultAgent`
- `acp.allowedAgents[]`
- `acp.maxConcurrentSessions`
- `acp.stream.coalesceIdleMs`
- `acp.stream.maxChunkChars`
- `acp.runtime.ttlMinutes`
- `acp.controlPlane.store` (predeterminado `sqlite`)
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

Claves de plugin/backend (sección del plugin acpx):

- anulaciones de comando/ruta de backend
- lista de permitidos de entorno de backend
- preajustes por agente de backend
- tiempos de espera de inicio/parada del backend
- máximo de ejecuciones simultáneas del backend por sesión

## Especificación de implementación

### Módulos del plano de control (nuevos)

Añadir módulos dedicados del plano de control ACP en el núcleo:

- `src/acp/control-plane/manager.ts`
  - posee los actores ACP, transiciones de ciclo de vida, serialización de comandos
- `src/acp/control-plane/store.ts`
  - gestión de esquemas SQLite, transacciones, asistentes de consulta
- `src/acp/control-plane/events.ts`
  - definiciones de eventos ACP tipados y serialización
- `src/acp/control-plane/checkpoint.ts`
  - puntos de control de entrega duraderos y cursores de reproducción
- `src/acp/control-plane/idempotency.ts`
  - reserva de clave de idempotencia y reproducción de respuesta
- `src/acp/control-plane/recovery.ts`
  - plan de conciliación al arranque y rehidratación de actores

Módulos puente de compatibilidad:

- `src/acp/runtime/session-meta.ts`
  - permanece temporalmente para la proyección en `SessionEntry.acp`
  - debe dejar de ser la fuente de verdad después de la transición de la migración

### Invariantes requeridas (deben hacerse cumplir en el código)

- La creación de la sesión ACP y el enlace al subproceso son atómicos (transacción única)
- hay como máximo una ejecución activa por actor de sesión ACP a la vez
- el evento `seq` es estrictamente creciente por ejecución
- el punto de control de entrega nunca avanza más allá del último evento confirmado
- la reproducción por idempotencia devuelve la carga útil de éxito anterior para claves de comando duplicadas
- los metadatos de ACP obsoletos/perdidos no pueden enrutar a la ruta de respuesta normal no ACP

### Puntos de contacto de Core

Archivos de Core para cambiar:

- `src/auto-reply/reply/dispatch-from-config.ts`
  - las llamadas a la rama ACP `AcpSessionManager.submit` y la entrega de proyección de eventos
  - eliminar el respaldo directo de ACP que omite las invariantes del plano de control
- `src/auto-reply/reply/inbound-context.ts` (o el límite de contexto normalizado más cercano)
  - exponer claves de enrutamiento normalizadas y semillas de idempotencia para el plano de control ACP
- `src/config/sessions/types.ts`
  - mantener `SessionEntry.acp` como campo de compatibilidad solo para proyecciones
- `src/gateway/server-methods/sessions.ts`
  - restablecer/eliminar/archivar debe llamar a la ruta de transacción de cierre/desenlace del administrador ACP
- `src/infra/outbound/bound-delivery-router.ts`
  - hacer cumplir el comportamiento de destino de cierre fallido para los turnos de sesión enlazados a ACP
- `src/discord/monitor/thread-bindings.ts`
  - agregar auxiliares de validación de enlace obsoleto de ACP conectados a búsquedas del plano de control
- `src/auto-reply/reply/commands-acp.ts`
  - enrutar spawn/cancel/close/steer a través de las API del administrador ACP
- `src/agents/acp-spawn.ts`
  - detener las escrituras de metadatos ad-hoc; llamar a la transacción de generación del administrador ACP
- `src/plugin-sdk/**` y el puente del tiempo de ejecución del complemento
  - exponer el registro del backend ACP y la semántica de salud de manera limpia

Archivos de Core explícitamente no reemplazados:

- `src/discord/monitor/message-handler.preflight.ts`
  - mantener el comportamiento de anulación de enlace de subproceso como el solucionador de clave de sesión canónico

### API de registro de tiempo de ejecución ACP

Agregar un módulo de registro principal:

- `src/acp/runtime/registry.ts`

API requerida:

```ts
export type AcpRuntimeBackend = {
  id: string;
  runtime: AcpRuntime;
  healthy?: () => boolean;
};

export function registerAcpRuntimeBackend(backend: AcpRuntimeBackend): void;
export function unregisterAcpRuntimeBackend(id: string): void;
export function getAcpRuntimeBackend(id?: string): AcpRuntimeBackend | null;
export function requireAcpRuntimeBackend(id?: string): AcpRuntimeBackend;
```

Comportamiento:

- `requireAcpRuntimeBackend` arroja un error tipificado de backend ACP faltante cuando no está disponible
- el servicio del complemento registra el backend en `start` y anula el registro en `stop`
- las búsquedas del tiempo de ejecución son de solo lectura y locales al proceso

### contrato del complemento del tiempo de ejecución acpx (detalle de implementación)

Para el primer backend de producción (`extensions/acpx`), OpenClaw y acpx están conectados con un contrato de comandos estricto:

- backend id: `acpx`
- plugin service id: `acpx-runtime`
- runtime handle encoding: `runtimeSessionName = acpx:v1:<base64url(json)>`
- campos de carga codificada:
  - `name` (sesión con nombre acpx; usa OpenClaw `sessionKey`)
  - `agent` (comando de agente acpx)
  - `cwd` (raíz del espacio de trabajo de la sesión)
  - `mode` (`persistent | oneshot`)

Asignación de comandos:

- asegurar sesión:
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- turno de prompt:
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- cancelar:
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- cerrar:
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

Transmisión (Streaming):

- OpenClaw consume eventos nd de `acpx --format json --json-strict`
- `text` => `text_delta/output`
- `thought` => `text_delta/thought`
- `tool_call` => `tool_call`
- `done` => `done`
- `error` => `error`

### Parche del esquema de sesión

Parchear `SessionEntry` en `src/config/sessions/types.ts`:

```ts
type SessionAcpMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

Campo persistido:

- `SessionEntry.acp?: SessionAcpMeta`

Reglas de migración:

- fase A: doble escritura (proyección `acp` + fuente de verdad ACP SQLite)
- fase B: lectura principal desde ACP SQLite, lectura de reserva desde `SessionEntry.acp` heredado
- fase C: comando de migración rellena las filas ACP faltantes desde entradas heredadas válidas
- fase D: eliminar la lectura de reserva y mantener la proyección opcional solo para la UX
- los campos heredados (`cliSessionIds`, `claudeCliSessionId`) permanecen sin tocar

### Contrato de error

Añadir códigos de error ACP estables y mensajes para el usuario:

- `ACP_BACKEND_MISSING`
  - mensaje: `ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - mensaje: `ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - mensaje: `Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - message: `ACP turn failed before completion.`

Reglas:

- devolver un mensaje procesable seguro para el usuario en el hilo
- registrar el error detallado de backend/sistema solo en los registros de tiempo de ejecución
- nunca volver silenciosamente a la ruta normal de LLM cuando se seleccionó explícitamente el enrutamiento ACP

### Árbitro de entrega duplicada

Regla única de enrutamiento para turnos enlazados a ACP:

- si existe un enlace de hilo activo para la sesión ACP de destino y el contexto del solicitante, entregar solo a ese hilo enlazado
- no enviar también al canal principal para el mismo turno
- si la selección del destino enlazado es ambigua, fallar de forma cerrada con un error explícito (sin respaldo implícito al principal)
- si no existe ningún enlace activo, utilizar el comportamiento de destino de sesión normal

### Observabilidad y preparación operacional

Métricas requeridas:

- recuento de éxitos/fallos de generación de ACP por backend y código de error
- percentiles de latencia de ejecución de ACP (espera en cola, tiempo de turno de ejecución, tiempo de proyección de entrega)
- recuento de reinicios del actor ACP y motivo del reinicio
- recuento de detecciones de enlaces obsoletos
- tasa de aciertos de reproducción por idempotencia
- contadores de reintentos de entrega en Discord y límites de tasa

Registros requeridos:

- registros estructurados claveados por `sessionKey`, `runId`, `backend`, `threadId`, `idempotencyKey`
- registros explícitos de transición de estado para las máquinas de estado de sesión y ejecución
- registros de comandos del adaptador con argumentos seguros de redacción y resumen de salida

Diagnósticos requeridos:

- `/acp sessions` incluye el estado, la ejecución activa, el último error y el estado del enlace
- `/acp doctor` (o equivalente) valida el registro del backend, el estado del almacén y los enlaces obsoletos

### Precedencia de configuración y valores efectivos

Precedencia de habilitación de ACP:

- anulación de cuenta: `channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- anulación de canal: `channels.discord.threadBindings.spawnAcpSessions`
- puerta global de ACP: `acp.enabled`
- puerta de despacho: `acp.dispatch.enabled`
- disponibilidad del backend: backend registrado para `acp.backend`

Comportamiento de autohabilitación:

- cuando ACP está configurado (`acp.enabled=true`, `acp.dispatch.enabled=true`, o
  `acp.backend=acpx`), la autohabilitación del complemento marca `plugins.entries.acpx.enabled=true`
  a menos que esté en la lista de bloqueo o deshabilitado explícitamente

Valor efectivo de TTL:

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### Mapa de pruebas

Pruebas unitarias:

- `src/acp/runtime/registry.test.ts` (nuevo)
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts` (nuevo)
- `src/infra/outbound/bound-delivery-router.test.ts` (ampliar casos de fail-closed de ACP)
- `src/config/sessions/types.test.ts` o pruebas de session-store más cercanas (persistencia de metadatos de ACP)

Pruebas de integración:

- `src/discord/monitor/reply-delivery.test.ts` (comportamiento del destino de entrega de ACP vinculado)
- `src/discord/monitor/message-handler.preflight*.test.ts` (continuidad del enrutamiento de session-key de ACP vinculado)
- pruebas del runtime del plugin acpx en el paquete backend (registro/inicio/detención del servicio + normalización de eventos)

Pruebas e2e de Gateway:

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts` (ampliar la cobertura del ciclo de vida de restablecimiento/eliminación de ACP)
- E2e de ida y vuelta de turno de hilo ACP para spawn, message, stream, cancel, unfocus, recuperación de reinicio

### Guardia de lanzamiento

Agregar interruptor de cierre independiente de despacho de ACP:

- `acp.dispatch.enabled` predeterminado `false` para el primer lanzamiento
- cuando está deshabilitado:
  - Los comandos de control de ACP spawn/focus aún pueden vincular sesiones
  - La ruta de despacho de ACP no se activa
  - el usuario recibe un mensaje explícito de que el despacho de ACP está deshabilitado por política
- después de la validación de canary, el valor predeterminado puede cambiar a `true` en un lanzamiento posterior

## Plan de comandos y experiencia de usuario

### Nuevos comandos

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### Compatibilidad con comandos existentes

- `/focus <sessionKey>` sigue admitiendo destinos de ACP
- `/unfocus` mantiene la semántica actual
- `/session idle` y `/session max-age` reemplazan la antigua anulación de TTL

## Lanzamiento por fases

### Fase 0 ADR y congelación de esquema

- publicar ADR para la propiedad del plano de control de ACP y los límites del adaptador
- congelar esquema de BD (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- definir códigos de error de ACP estables, contrato de eventos y guardias de transición de estado

### Fase 1 Base del plano de control en core

- implementar `AcpSessionManager` y el runtime de actor por sesión
- implementar la tienda SQLite de ACP y los asistentes de transacción
- implementar la tienda de idempotencia y los asistentes de repetición
- implementar módulos de anexión de eventos y puntos de control de entrega
- conectar las API spawn/cancel/close al administrador con garantías transaccionales

### Fase 2 Integración del enrutamiento y ciclo de vida principales

- enrutar turnos ACP vinculados a hilos desde la canalización de despacho hacia el administrador ACP
- forzar el enrutamiento de cierre seguro cuando fallen los invariantes de vinculación/sesión de ACP
- integrar el ciclo de vida reset/delete/archive/unfocus con las transacciones de cierre/desvinculación de ACP
- agregar detección de vinculación obsoleta y política opcional de desvinculación automática

### Fase 3 Adaptador/complemento de backend acpx

- implementar el adaptador `acpx` contra el contrato de tiempo de ejecución (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- agregar verificaciones de salud del backend y registro de inicio/desmontaje
- normalizar eventos nd de acpx en eventos de tiempo de ejecución de ACP
- forzar tiempos de espera del backend, supervisión de procesos y política de reinicio/backoff

### Fase 4 Proyección de entrega y experiencia de usuario del canal (Discord primero)

- implementar la proyección del canal impulsada por eventos con reanudación desde puntos de control (Discord primero)
- fusionar fragmentos de transmisión con una política de vaciado consciente de los límites de velocidad
- garantizar exactamente un mensaje final de finalización por ejecución
- publicar `/acp spawn`, `/acp cancel`, `/acp steer`, `/acp close`, `/acp sessions`

### Fase 5 Migración y transición

- introducir escritura dual en la proyección `SessionEntry.acp` más la fuente de verdad SQLite de ACP
- agregar utilidad de migración para filas de metadatos heredadas de ACP
- cambiar la ruta de lectura a SQLite principal de ACP
- eliminar el enrutamiento de reserva heredado que depende de `SessionEntry.acp` faltante

### Fase 6 Endurecimiento, SLO y límites de escala

- forzar límites de concurrencia (global/cuenta/sesión), políticas de cola y presupuestos de tiempo de espera
- agregar telemetría completa, paneles y umbrales de alerta
- prueba de caos de recuperación de fallos y supresión de entregas duplicadas
- publicar el manual de procedimientos para interrupciones del backend, corrupción de la base de datos y remediación de vinculación obsoleta

### Lista de verificación de implementación completa

- módulos y pruebas del plano de control principal
- migraciones de base de datos y plan de reversión
- Integración de la API del gestor de ACP a través de dispatch y comandos
- interfaz de registro del adaptador en el puente del runtime del plugin
- implementación y pruebas del adaptador acpx
- lógica de proyección de entrega de canal con capacidad de hilo con reproducción desde punto de control (Discord primero)
- ganchos de ciclo de vida para restablecimiento/eliminación/archivo/desenfoque
- detector de enlaces obsoletos y diagnósticos orientados al operador
- pruebas de validación y precedencia de configuración para todas las nuevas claves de ACP
- documentación operativa y manual de procedimientos de resolución de problemas

## Plan de pruebas

Pruebas unitarias:

- Límites de transacción de la base de datos de ACP (atomicidad de spawn/bind/enqueue, cancelación, cierre)
- Guardias de transición de la máquina de estados de ACP para sesiones y ejecuciones
- semánticas de reserva/reproducción de idempotencia en todos los comandos de ACP
- serialización y ordenamiento de cola del actor por sesión
- analizador de eventos y coalescedor de fragmentos acpx
- política de reinicio y retroceso del supervisor del runtime
- precedencia de configuración y cálculo de TTL efectivo
- selección de rama de enrutamiento principal de ACP y comportamiento de fail-closed cuando el backend/sesión no es válido

Pruebas de integración:

- proceso de adaptador ACP falso para transmisión determinista y comportamiento de cancelación
- integración del gestor de ACP + dispatch con persistencia transaccional
- enrutamiento entrante vinculado al hilo hacia la clave de sesión de ACP
- la entrega saliente vinculada al hilo suprime la duplicación del canal principal
- la reproducción desde punto de control se recupera después de un fallo de entrega y reanuda desde el último evento
- registro del servicio de plugin y desmontaje del backend del runtime ACP

Pruebas e2e de Gateway:

- generar ACP con hilo, intercambiar indicaciones de varios turnos, desenfocar
- reinicio de gateway con base de datos ACP persistida y enlaces, luego continuar la misma sesión
- las sesiones ACP concurrentes en múltiples hilos no tienen interferencias cruzadas
- los reintentos de comandos duplicados (misma clave de idempotencia) no crean ejecuciones o respuestas duplicadas
- el escenario de enlace obsoleto produce un error explícito y un comportamiento opcional de limpieza automática

## Riesgos y mitigaciones

- Entregas duplicadas durante la transición
  - Mitigación: resolvedor de destino único y punto de control de eventos idempotente
- Rotación de procesos del runtime bajo carga
  - Mitigación: propietarios de larga duración por sesión + límites de concurrencia + retroceso
- Plugin ausente o mal configurado
  - Mitigación: error explícito orientado al operador y enrutamiento ACP fail-closed (sin retorno implícito a la ruta de sesión normal)
- Confusión de configuración entre puertas de subagente y ACP
  - Mitigación: claves ACP explícitas y comentarios de comandos que incluyan la fuente de la política efectiva
- Corrupción del almacén del plano de control o errores de migración
  - Mitigación: modo WAL, ganchos de copia de seguridad/restauración, pruebas de humo de migración y diagnósticos de respaldo de solo lectura
- Interbloqueos (deadlocks) de actores o inanición del buzón
  - Mitigación: temporizadores de vigilancia (watchdog), sondeos de salud de actores y profundidad de buzón limitada con telemetría de rechazo

## Lista de verificación de aceptación

- El inicio de sesión ACP puede crear o vincular un hilo en un adaptador de canal compatible (actualmente Discord)
- todos los mensajes del hilo se enrutan solo a la sesión ACP vinculada
- las salidas de ACP aparecen con la misma identidad de hilo con transmisión (streaming) o lotes
- sin salida duplicada en el canal principal para turnos vinculados
- inicio+vinculación+encolado inicial son atómicos en el almacén persistente
- los reintentos de comandos ACP son idempotentes y no duplican ejecuciones o salidas
- cancelar, cerrar, desenfocar, archivar, restablecer y eliminar realizan una limpieza determinista
- el reinicio tras fallo preserva la asignación y reanuda la continuidad multipaso
- las sesiones ACP vinculadas a hilos simultáneas funcionan de forma independiente
- el estado faltante en el backend ACP produce un error claro y accionable
- los vínculos obsoletos se detectan y muestran explícitamente (con una limpieza automática segura opcional)
- las métricas y diagnósticos del plano de control están disponibles para los operadores
- pasan las nuevas coberturas unitarias, de integración y de un extremo a otro (e2e)

## Apéndice: refactorizaciones específicas para la implementación actual (estado)

Estas son tareas de seguimiento no bloqueantes para mantener la ruta ACP mantenible después de que se implemente el conjunto de funciones actual.

### 1) Centralizar la evaluación de la política de despacho ACP (completado)

- implementado mediante asistentes de política ACP compartidos en `src/acp/policy.ts`
- el despacho, los manejadores del ciclo de vida de comandos ACP y la ruta de inicio ACP ahora consumen la lógica de política compartida

### 2) Dividir el manejador de comandos ACP por dominio de subcomando (completado)

- `src/auto-reply/reply/commands-acp.ts` es ahora un enrutador ligero
- el comportamiento del subcomando se divide en:
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - asistentes compartidos en `src/auto-reply/reply/commands-acp/shared.ts`

### 3) Dividir el gestor de sesiones ACP por responsabilidad (completado)

- el gestor se divide en:
  - `src/acp/control-plane/manager.ts` (fachada pública + singleton)
  - `src/acp/control-plane/manager.core.ts` (implementación del gestor)
  - `src/acp/control-plane/manager.types.ts` (tipos/deps del gestor)
  - `src/acp/control-plane/manager.utils.ts` (normalización + funciones auxiliares)

### 4) Limpieza opcional del adaptador de tiempo de ejecución acpx

- `extensions/acpx/src/runtime.ts` se puede dividir en:
- ejecución/supervisión de procesos
- análisis/normalización de eventos nd
- superficie de la API de tiempo de ejecución (`submit`, `cancel`, `close`, etc.)
- mejora la comprobabilidad y facilita la auditoría del comportamiento del backend

import en from "/components/footer/en.mdx";

<en />
