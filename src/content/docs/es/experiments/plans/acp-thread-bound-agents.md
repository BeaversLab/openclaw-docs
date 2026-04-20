---
summary: "Integrar los agentes de codificación ACP mediante un plano de control ACP de primera clase en el núcleo y tiempos de ejecución respaldados por complementos (acpx primero)"
owner: "onutc"
status: "borrador"
last_updated: "2026-02-25"
title: "Agentes ACP vinculados a hilos"
---

# Agentes ACP vinculados a hilos

## Descripción general

Este plan define cómo OpenClaw debe soportar agentes de codificación ACP en canales con capacidad de hilos (Discord primero) con un ciclo de vida y recuperación a nivel de producción.

Documento relacionado:

- [Plan de refactorización de transmisión de tiempo de ejecución unificada](/es/experiments/plans/acp-unified-streaming-refactor)

Experiencia de usuario objetivo:

- un usuario genera o centra una sesión ACP en un hilo
- los mensajes de usuario en ese hilo se enrutan a la sesión ACP vinculada
- la salida del agente se transmite de vuelta a la misma personalidad del hilo
- la sesión puede ser persistente o de un solo uso con controles de limpieza explícitos

## Resumen de decisiones

La recomendación a largo plazo es una arquitectura híbrida:

- OpenClaw core posee las preocupaciones del plano de control ACP
  - identidad y metadatos de la sesión
  - vinculación de hilos y decisiones de enrutamiento
  - invariantes de entrega y supresión de duplicados
  - semántica de limpieza y recuperación del ciclo de vida
- el backend del tiempo de ejecución ACP es conectable
  - el primer backend es un servicio de complemento respaldado por acpx
  - el tiempo de ejecución realiza el transporte, la puesta en cola, la cancelación y la reconexión de ACP

OpenClaw no debe reimplementar los internos del transporte ACP en el núcleo.
OpenClaw no debe depender de una ruta de interceptación puramente de complementos para el enrutamiento.

## Arquitectura estelar (santo grial)

Tratar ACP como un plano de control de primera clase en OpenClaw, con adaptadores de tiempo de ejecución conectables.

Invariantes innegociables:

- cada vinculación de hilo ACP hace referencia a un registro de sesión ACP válido
- cada sesión ACP tiene un estado de ciclo de vida explícito (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- cada ejecución de ACP tiene un estado de ejecución explícito (`queued`, `running`, `completed`, `failed`, `cancelled`)
- spawn, bind, y la puesta en cola inicial son atómicos
- los reintentos de comandos son idempotentes (sin ejecuciones duplicadas ni salidas duplicadas en Discord)
- la salida del canal de hilo vinculado es una proyección de los eventos de ejecución de ACP, nunca efectos secundarios ad hoc

Modelo de propiedad a largo plazo:

- `AcpSessionManager` es el único escritor y orquestador de ACP
- el gestor vive primero en el proceso de la puerta de enlace; se puede mover a un sidecar dedicado más tarde detrás de la misma interfaz
- por clave de sesión ACP, el gestor posee un actor en memoria (ejecución de comandos serializada)
- los adaptadores (`acpx`, backends futuros) son solo implementaciones de transporte/ejecución

Modelo de persistencia a largo plazo:

- mover el estado del plano de control de ACP a un almacén SQLite dedicado (modo WAL) bajo el directorio de estado de OpenClaw
- mantener `SessionEntry.acp` como proyección de compatibilidad durante la migración, no como fuente de verdad
- almacenar eventos ACP solo anexados para admitir repetición, recuperación de fallos y entrega determinista

### Estrategia de entrega (puente al santo grial)

- puente a corto plazo
  - mantener los mecanismos actuales de vinculación de hilos y la superficie de configuración ACP existente
  - corregir errores de brecha de metadatos y enrutar los turnos de ACP a través de una única rama central de ACP
  - agregar claves de idempotencia y verificaciones de enrutamiento de falla cerrada inmediatamente
- transición a largo plazo
  - mover la fuente de verdad de ACP a la base de datos del plano de control + actores
  - hacer que la entrega al hilo vinculado sea puramente basada en proyección de eventos
  - eliminar el comportamiento de respaldo heredado que depende de metadatos de entrada de sesión oportunista

## ¿Por qué no solo un complemento puro?

Los ganchos de complemento actuales no son suficientes para el enrutamiento de sesión ACP de extremo a extremo sin cambios en el núcleo.

- el enrutamiento entrante desde la vinculación de hilo se resuelve a una clave de sesión en el despacho central primero
- los ganchos de mensajes son de disparar y olvidar, y no pueden cortocircuitar la ruta principal de respuesta
- los comandos de complemento son buenos para operaciones de control, pero no para reemplazar el flujo de despacho por turno del núcleo

Resultado:

- el tiempo de ejecución de ACP se puede convertir en complemento
- la rama de enrutamiento de ACP debe existir en el núcleo

## Fundación existente para reutilizar

Ya implementado y debe permanecer canónico:

- el objetivo de vinculación de hilo admite `subagent` y `acp`
- la invalidación del enrutamiento de hilo entrante se resuelve mediante vinculación antes del despacho normal
- identidad de hilo saliente a través de webhook en la entrega de respuesta
- `/focus` y `/unfocus` flujo con compatibilidad de destino ACP
- almacenamiento de enlace persistente con restauración al inicio
- ciclo de vida de desenlace en archivar, eliminar, perder el foco, restablecer y eliminar

Este plan extiende esa base en lugar de reemplazarla.

## Arquitectura

### Modelo de límites (Boundary model)

Núcleo (debe estar en OpenClaw core):

- rama de despacho en modo de sesión ACP en la canalización de respuesta
- arbitraje de entrega para evitar la duplicación del padre y del hilo
- persistencia del plano de control de ACP (con proyección de compatibilidad `SessionEntry.acp` durante la migración)
- semántica de desenlace del ciclo de vida y desacoplamiento en tiempo de ejecución vinculada al restablecimiento/eliminación de la sesión

Backend del complemento (implementación acpx):

- supervisión del trabajador de tiempo de ejecución ACP
- invocación del proceso acpx y análisis de eventos
- controladores de comandos ACP (`/acp ...`) y experiencia del usuario del operador
- valores predeterminados de configuración específicos del backend y diagnósticos

### Modelo de propiedad del tiempo de ejecución

- un proceso de puerta de enlace posee el estado de orquestación de ACP
- la ejecución de ACP se ejecuta en procesos secundarios supervisados a través del backend acpx
- la estrategia de proceso es de larga duración por clave de sesión ACP activa, no por mensaje

Esto evita el costo de inicio en cada indicación y mantiene la semántica de cancelación y reconexión confiable.

### Contrato central del tiempo de ejecución

Agregue un contrato central de tiempo de ejecución de ACP para que el código de enrutamiento no dependa de los detalles de la CLI y pueda cambiar los backends sin cambiar la lógica de despacho:

```ts
export type AcpRuntimePromptMode = "prompt" | "steer";

export type AcpRuntimeHandle = {
  sessionKey: string;
  backend: string;
  runtimeSessionName: string;
};

export type AcpRuntimeEvent = { type: "text_delta"; stream: "output" | "thought"; text: string } | { type: "tool_call"; name: string; argumentsText: string } | { type: "done"; usage?: Record<string, number> } | { type: "error"; code: string; message: string; retryable?: boolean };

export interface AcpRuntime {
  ensureSession(input: { sessionKey: string; agent: string; mode: "persistent" | "oneshot"; cwd?: string; env?: Record<string, string>; idempotencyKey: string }): Promise<AcpRuntimeHandle>;

  submit(input: { handle: AcpRuntimeHandle; text: string; mode: AcpRuntimePromptMode; idempotencyKey: string }): Promise<{ runtimeRunId: string }>;

  stream(input: { handle: AcpRuntimeHandle; runtimeRunId: string; onEvent: (event: AcpRuntimeEvent) => Promise<void> | void; signal?: AbortSignal }): Promise<void>;

  cancel(input: { handle: AcpRuntimeHandle; runtimeRunId?: string; reason?: string; idempotencyKey: string }): Promise<void>;

  close(input: { handle: AcpRuntimeHandle; reason: string; idempotencyKey: string }): Promise<void>;

  health?(): Promise<{ ok: boolean; details?: string }>;
}
```

Detalle de implementación:

- primer backend: `AcpxRuntime` enviado como servicio de complemento
- el núcleo resuelve el tiempo de ejecución a través del registro y falla con un error explícito del operador cuando no hay ningún backend de tiempo de ejecución de ACP disponible

### Modelo de datos y persistencia del plano de control

La fuente de verdad a largo plazo es una base de datos SQLite dedicada para ACP (modo WAL), para actualizaciones transaccionales y recuperación segura contra fallos:

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
- los identificadores de procesos y los sockets permanecen solo en la memoria
- el ciclo de vida duradero y el estado de ejecución residen en la base de datos de ACP, no en el JSON de sesión genérico
- si el propietario del tiempo de ejecución muere, la puerta de enlace se rehidrata desde la base de datos de ACP y se reanuda desde los puntos de control

### Enrutamiento y entrega

Entrante:

- mantener la búsqueda de vinculación de hilo actual como primer paso de enrutamiento
- si el destino vinculado es una sesión de ACP, enrutar a la rama de tiempo de ejecución de ACP en lugar de `getReplyFromConfig`
- el comando explícito `/acp steer` usa `mode: "steer"`

Saliente:

- el flujo de eventos de ACP se normaliza en fragmentos de respuesta de OpenClaw
- el destino de entrega se resuelve a través de la ruta de destino vinculado existente
- cuando un hilo vinculado está activo para ese turno de sesión, se suprime la finalización del canal principal

Política de transmisión:

- transmitir salida parcial con ventana de fusión
- intervalo mínimo y bytes de fragmento máximo configurables para mantenerse por debajo de los límites de velocidad de Discord
- mensaje final siempre emitido al completarse o fallar

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
  - crear/actualizar fila de vinculación de hilo ACP
  - poner en cola la fila de ejecución inicial
- cerrar transacción
  - marcar sesión como cerrada
  - eliminar/expirar filas de vinculación
  - escribir evento de cierre final
- cancelar transacción
  - marcar ejecución objetivo como cancelando/cancelada con clave de idempotencia

No se permite el éxito parcial a través de estos límites.

### Modelo de actor por sesión

`AcpSessionManager` ejecuta un actor por clave de sesión ACP:

- el buzón de correo del actor (mailbox) serializa los efectos secundarios de `submit`, `cancel`, `close` y `stream`
- el actor posee la hidratación del identificador de tiempo de ejecución y el ciclo de vida del proceso del adaptador de tiempo de ejecución para esa sesión
- el actor escribe eventos de ejecución en orden (`seq`) antes de cualquier entrega a Discord
- el actor actualiza los puntos de control de entrega después de un envío saliente exitoso

Esto elimina las condiciones de carrera entre turnos y evita una salida de hilo duplicada o fuera de orden.

### Idempotencia y proyección de entrega

Todas las acciones externas de ACP deben llevar claves de idempotencia:

- clave de idempotencia de generación
- clave de idempotencia de prompt/dirección
- clave de idempotencia de cancelación
- clave de idempotencia de cierre

Reglas de entrega:

- Los mensajes de Discord se derivan de `acp_events` más `acp_delivery_checkpoint`
- los reintentos se reanudan desde el punto de control sin volver a enviar los fragmentos ya entregados
- la emisión de respuesta final es exactamente una vez por ejecución desde la lógica de proyección

### Recuperación y autocuración

Al iniciar la puerta de enlace:

- cargar sesiones ACP no terminales (`creating`, `idle`, `running`, `cancelling`, `error`)
- recrear actores de forma diferida en el primer evento entrante o de forma ansiosa bajo el límite configurado
- conciliar cualquier ejecución de `running` que falten latidos y marcar `failed` o recuperar mediante adaptador

En un mensaje entrante del hilo de Discord:

- si existe un enlace pero falta la sesión ACP, fallar cerrado con un mensaje explícito de enlace obsoleto
- opcionalmente desvincular automáticamente el enlace obsoleto después de una validación segura para el operador
- nunca enrutar silenciosamente los enlaces ACP obsoletos a la ruta normal de LLM

### Ciclo de vida y seguridad

Operaciones compatibles:

- cancelar la ejecución actual: `/acp cancel`
- desvincular hilo: `/unfocus`
- cerrar sesión ACP: `/acp close`
- cerrar automáticamente las sesiones inactivas por TTL efectivo

Política de TTL:

- el TTL efectivo es el mínimo de
  - TTL global/de sesión
  - TTL de enlace de hilo de Discord
  - TTL del propietario del tiempo de ejecución ACP

Controles de seguridad:

- lista de permitidos de agentes ACP por nombre
- restringir las raíces del espacio de trabajo para las sesiones ACP
- passthrough de lista de permitidos de entorno
- máximo de sesiones ACP simultáneas por cuenta y globalmente
- retroceso de reinicio limitado para fallos del tiempo de ejecución

## Superficie de configuración

Claves principales:

- `acp.enabled`
- `acp.dispatch.enabled` (interruptor de apagado de enrutamiento ACP independiente)
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

Claves de complemento/backend (sección de complemento acpx):

- anulaciones de comando/ruta del backend
- lista de permitidos de entorno del backend
- preajustes por agente del backend
- tiempos de espera de inicio/parada del backend
- máximo de ejecuciones en vuelo del backend por sesión

## Especificación de implementación

### Módulos del plano de control (nuevos)

Agregar módulos dedicados del plano de control ACP en core:

- `src/acp/control-plane/manager.ts`
  - posee actores ACP, transiciones de ciclo de vida, serialización de comandos
- `src/acp/control-plane/store.ts`
  - gestión de esquemas SQLite, transacciones, asistentes de consulta
- `src/acp/control-plane/events.ts`
  - definiciones de eventos ACP tipadas y serialización
- `src/acp/control-plane/checkpoint.ts`
  - puntos de control de entrega duraderos y cursores de reproducción
- `src/acp/control-plane/idempotency.ts`
  - reserva de clave de idempotencia y reproducción de respuesta
- `src/acp/control-plane/recovery.ts`
  - plan de conciliación al inicio y rehidratación de actores

Módulos de puente de compatibilidad:

- `src/acp/runtime/session-meta.ts`
  - permanece temporalmente para la proyección en `SessionEntry.acp`
  - debe dejar de ser la fuente de verdad después del corte de migración

### Invariantes requeridas (deben aplicarse en código)

- la creación de sesión ACP y el enlace al hilo son atómicos (transacción única)
- hay como máximo una ejecución activa por actor de sesión ACP a la vez
- evento `seq` es estrictamente creciente por ejecución
- el punto de control de entrega nunca avanza más allá del último evento confirmado
- la reproducción de idempotencia devuelve la carga útil de éxito anterior para claves de comando duplicadas
- los metadatos de ACP obsoletos/faltantes no pueden enrutar a la ruta de respuesta no ACP normal

### Puntos de contacto clave

Archivos principales a cambiar:

- `src/auto-reply/reply/dispatch-from-config.ts`
  - la rama ACP llama a `AcpSessionManager.submit` y entrega de proyección de eventos
  - eliminar el respaldo directo de ACP que omite las invariantes del plano de control
- `src/auto-reply/reply/inbound-context.ts` (o límite de contexto normalizado más cercano)
  - exponer claves de enrutamiento normalizadas y semillas de idempotencia para el plano de control ACP
- `src/config/sessions/types.ts`
  - mantener `SessionEntry.acp` como campo de compatibilidad solo de proyección
- `src/gateway/server-methods/sessions.ts`
  - restablecer/eliminar/archivar debe llamar a la ruta de transacción de cierre/desenlace del administrador ACP
- `src/infra/outbound/bound-delivery-router.ts`
  - hacer cumplir el comportamiento de destino de cierre seguro para turnos de sesión vinculados a ACP
- `src/discord/monitor/thread-bindings.ts`
  - agregar ayudantes de validación de enlaces obsoletos de ACP conectados a búsquedas del plano de control
- `src/auto-reply/reply/commands-acp.ts`
  - enrutar generación/cancelación/cierre/dirección a través de las API del administrador ACP
- `src/agents/acp-spawn.ts`
  - detener escrituras de metadatos ad hoc; llamar a la transacción de generación del administrador ACP
- `src/plugin-sdk/**` y puente de tiempo de ejecución del complemento
  - exponer claramente el registro del backend ACP y la semántica de estado

Archivos principales explícitamente no reemplazados:

- `src/discord/monitor/message-handler.preflight.ts`
  - mantener el comportamiento de anulación de vinculación de hilo como el solucionador canónico de clave de sesión

### API de registro de tiempo de ejecución de ACP

Añadir un módulo de registro central:

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

- `requireAcpRuntimeBackend` lanza un error tipificado de backend ACP faltante cuando no está disponible
- el servicio de complemento registra el backend en `start` y anula el registro en `stop`
- las búsquedas en tiempo de ejecución son de solo lectura y locales del proceso

### contrato de complemento de tiempo de ejecución acpx (detalle de implementación)

Para el primer backend de producción (`extensions/acpx`), OpenClaw y acpx están
conectados con un contrato de comando estricto:

- id del backend: `acpx`
- id del servicio de complemento: `acpx-runtime`
- codificación del identificador de tiempo de ejecución: `runtimeSessionName = acpx:v1:<base64url(json)>`
- campos de carga útil codificada:
  - `name` (sesión con nombre de acpx; usa `sessionKey` de OpenClaw)
  - `agent` (comando de agente acpx)
  - `cwd` (raíz del espacio de trabajo de la sesión)
  - `mode` (`persistent | oneshot`)

Mapeo de comandos:

- asegurar sesión:
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- turno de aviso (prompt turn):
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

Campo persistente:

- `SessionEntry.acp?: SessionAcpMeta`

Reglas de migración:

- fase A: doble escritura (proyección `acp` + fuente de verdad ACP SQLite)
- fase B: lectura principal desde ACP SQLite, lectura de contingencia desde el `SessionEntry.acp` heredado
- fase C: el comando de migración rellena las filas ACP faltantes a partir de entradas heredadas válidas
- fase D: eliminar fallback-read y mantener proyección opcional solo para la UX
- los campos heredados (`cliSessionIds`, `claudeCliSessionId`) permanecen sin cambios

### Contrato de error

Añadir códigos de error ACP estables y mensajes orientados al usuario:

- `ACP_BACKEND_MISSING`
  - mensaje: `ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - mensaje: `ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - mensaje: `Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - mensaje: `ACP turn failed before completion.`

Reglas:

- devolver un mensaje procesable y seguro para el usuario en el hilo
- registrar el error detallado del backend/sistema solo en los registros de tiempo de ejecución
- nunca realizar silenciosamente una reserva a la ruta normal de LLM cuando se seleccionó explícitamente el enrutamiento ACP

### Arbitraje de entrega duplicada

Regla única de enrutamiento para turnos vinculados a ACP:

- si existe un enlace de hilo activo para la sesión ACP de destino y el contexto del solicitante, entregar solo a ese hilo vinculado
- no enviar también al canal principal para el mismo turno
- si la selección del destino vinculado es ambigua, fallar cerrado con un error explícito (sin reserva implícita al principal)
- si no existe un enlace activo, usar el comportamiento normal de destino de sesión

### Observabilidad y preparación operacional

Métricas requeridas:

- recuento de éxitos/fallos de generación de ACP por backend y código de error
- percentiles de latencia de ejecución de ACP (tiempo de espera en cola, tiempo de turno de ejecución, tiempo de proyección de entrega)
- recuento de reinicios del actor ACP y motivo del reinicio
- recuento de detecciones de enlace obsoleto
- tasa de aciertos de re reproducción por idempotencia
- contadores de reintentos de entrega y límites de tasa de Discord

Registros requeridos:

- registros estructurados claveados por `sessionKey`, `runId`, `backend`, `threadId`, `idempotencyKey`
- registros explícitos de transición de estado para las máquinas de estado de sesión y ejecución
- registros de comandos del adaptador con argumentos seguros de redacción y resumen de salida

Diagnósticos requeridos:

- `/acp sessions` incluye el estado, ejecución activa, último error y estado del enlace
- `/acp doctor` (o equivalente) valida el registro del backend, el estado del almacenamiento y los enlaces obsoletos

### Precedencia de configuración y valores efectivos

Precedencia de habilitación de ACP:

- anulación de cuenta: `channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- anulación de canal: `channels.discord.threadBindings.spawnAcpSessions`
- puerta global de ACP: `acp.enabled`
- puerta de despacho: `acp.dispatch.enabled`
- disponibilidad del backend: backend registrado para `acp.backend`

Comportamiento de habilitación automática:

- cuando ACP está configurado (`acp.enabled=true`, `acp.dispatch.enabled=true`, o
  `acp.backend=acpx`), la habilitación automática del complemento marca `plugins.entries.acpx.enabled=true`
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

- `src/discord/monitor/reply-delivery.test.ts` (comportamiento del objetivo de entrega de ACP vinculado)
- `src/discord/monitor/message-handler.preflight*.test.ts` (continuidad del enrutamiento de session-key de ACP vinculado)
- pruebas de tiempo de ejecución del complemento acpx en el paquete de backend (registro/inicio/parada del servicio + normalización de eventos)

Pruebas e2e de Gateway:

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts` (ampliar la cobertura del ciclo de vida de restablecimiento/eliminación de ACP)
- Ida y vuelta e2e de turnos de hilo de ACP para generación, mensaje, flujo, cancelación, pérdida de foco y recuperación de reinicio

### Guardia de lanzamiento

Agregar interruptor de corte de despacho de ACP independiente:

- `acp.dispatch.enabled` por defecto `false` para el primer lanzamiento
- cuando está deshabilitado:
  - Los comandos de control de generación/enfoque de ACP aún pueden vincular sesiones
  - La ruta de despacho de ACP no se activa
  - el usuario recibe un mensaje explícito de que el despacho de ACP está deshabilitado por política
- después de la validación canary, el valor predeterminado puede cambiarse a `true` en un lanzamiento posterior

## Plan de comandos y UX

### Nuevos comandos

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### Compatibilidad con comandos existentes

- `/focus <sessionKey>` continúa admitiendo objetivos de ACP
- `/unfocus` mantiene la semántica actual
- `/session idle` y `/session max-age` reemplazan la antigua anulación de TTL

## Lanzamiento por fases

### Fase 0 ADR y congelación del esquema

- publicar el ADR para la propiedad del plano de control de ACP y los límites del adaptador
- congelar el esquema de la base de datos (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- definir códigos de error estables de ACP, contrato de eventos y protecciones de transición de estado

### Fase 1: base del plano de control en el núcleo

- implementar `AcpSessionManager` y el tiempo de ejecución del actor por sesión
- implementar el almacén SQLite de ACP y los asistentes de transacciones
- implementar el almacén de idempotencia y los asistentes de repetición
- implementar módulos de anexión de eventos + punto de control de entrega
- conectar las API de spawn/cancel/close al gestor con garantías transaccionales

### Fase 2: enrutamiento del núcleo e integración del ciclo de vida

- enrutar los turnos de ACP vinculados al hilo desde la canalización de despacho hacia el gestor de ACP
- forzar el enrutamiento de cierre seguro (fail-closed) cuando fallen las invariantes de vinculación/sesión de ACP
- integrar el ciclo de vida de restablecimiento/eliminación/archivo/desenfoque con las transacciones de cierre/desvinculación de ACP
- agregar detección de vinculación obsoleta y política opcional de desvinculación automática

### Fase 3: adaptador/complemento de backend acpx

- implementar el adaptador `acpx` contra el contrato de tiempo de ejecución (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- agregar comprobaciones de estado de salud del backend y registro de inicio/limpieza
- normalizar los eventos nd de acpx en eventos de tiempo de ejecución de ACP
- forzar los tiempos de espera del backend, la supervisión de procesos y la política de reinicio/backoff

### Fase 4: proyección de entrega y experiencia de usuario del canal (Discord primero)

- implementar la proyección del canal basada en eventos con reanudación desde punto de control (Discord primero)
- agrupar fragmentos de transmisión con una política de vaciado consciente de los límites de velocidad
- garantizar un mensaje de finalización único exacto por ejecución
- publicar `/acp spawn`, `/acp cancel`, `/acp steer`, `/acp close`, `/acp sessions`

### Fase 5: migración y cambio

- introducir la doble escritura en la proyección `SessionEntry.acp` más la fuente de verdad SQLite de ACP
- agregar una utilidad de migración para las filas de metadatos heredadas de ACP
- cambiar la ruta de lectura a la principal de ACP SQLite
- eliminar el enrutamiento de reserva heredado que depende de `SessionEntry.acp` faltante

### Fase 6 Endurecimiento, SLO y límites de escala

- hacer cumplir los límites de concurrencia (global/cuenta/sesión), las políticas de cola y los presupuestos de tiempo de espera
- agregar telemetría completa, tableros y umbrales de alerta
- caos: pruebas de recuperación de fallos y supresión de entregas duplicadas
- publicar el manual de procedimientos para interrupciones del backend, corrupción de la base de datos y remediación de enlaces obsoletos

### Lista de verificación de implementación completa

- módulos principales del plano de control y pruebas
- migraciones de base de datos y plan de reversión
- integración de la API del gestor de ACP en el despacho y los comandos
- interfaz de registro del adaptador en el puente de tiempo de ejecución del complemento
- implementación y pruebas del adaptador acpx
- lógica de proyección de entrega de canales con capacidad de hilos con reproducción desde puntos de control (Discord primero)
- ganchos del ciclo de vida para restablecimiento/eliminación/archivo/desenfoque
- detector de enlaces obsoletos y diagnósticos para operadores
- pruebas de validación y precedencia de configuración para todas las nuevas claves de ACP
- documentación operativa y manual de procedimientos de solución de problemas

## Plan de pruebas

Pruebas unitarias:

- límites de transacción de la base de datos de ACP (atomicidad de generación/vinculación/puesta en cola, cancelación, cierre)
- guardias de transición de la máquina de estados de ACP para sesiones y ejecuciones
- semántica de reserva/reproducción de idempotencia en todos los comandos de ACP
- serialización del actor por sesión y ordenamiento de la cola
- analizador de eventos y consolidador de fragmentos acpx
- política de reinicio y retroceso del supervisor de tiempo de ejecución
- precedencia de configuración y cálculo efectivo de TTL
- selección de rama de enrutamiento central de ACP y comportamiento de cierre forzado cuando el backend/sesión no es válido

Pruebas de integración:

- proceso falso de adaptador ACP para transmisión determinista y comportamiento de cancelación
- integración del gestor de ACP + despacho con persistencia transaccional
- enrutamiento de entrada vinculado al hilo hacia la clave de sesión ACP
- la entrega de salida vinculada al hilo suprime la duplicación en el canal principal
- la reproducción desde el punto de control se recupera después de un fallo de entrega y se reanuda desde el último evento
- registro del servicio de complemento y desmontaje del backend de tiempo de ejecución de ACP

Pruebas e2e de Gateway:

- generar ACP con hilo, intercambiar indicaciones de varios turnos, desenfocar
- reiniciar el gateway con la base de datos ACP y los enlaces persistidos, luego continuar la misma sesión
- las sesiones ACP simultáneas en varios hilos no tienen interferencias cruzadas
- los reintentos de comandos duplicados (misma clave de idempotencia) no crean ejecuciones o respuestas duplicadas
- el escenario de enlace obsoleto produce un error explícito y un comportamiento opcional de limpieza automática

## Riesgos y mitigaciones

- Entregas duplicadas durante la transición
  - Mitigación: resolvedor de destino único y punto de control de eventos idempotente
- Rotación de procesos en tiempo de ejecución bajo carga
  - Mitigación: propietarios de larga duración por sesión + límites de concurrencia + retroceso exponencial
- Complemento ausente o mal configurado
  - Mitigación: error explícito para el operador y enrutamiento ACP de cierre seguro (sin retroceso implícito a la ruta de sesión normal)
- Confusión de configuración entre las puertas de subagente y ACP
  - Mitigación: claves ACP explícitas y comentarios de comandos que incluyen la fuente de política efectiva
- Corrupción del almacén del plano de control o errores de migración
  - Mitigación: modo WAL, ganchos de copia de seguridad/restauración, pruebas de humo de migración y diagnósticos de retroceso de solo lectura
- Interbloqueos de actores o inanición del buzón
  - Mitigación: temporizadores de perro guardián, sondas de salud de actores y profundidad de buzón limitada con telemetría de rechazo

## Lista de verificación de aceptación

- La generación de sesión ACP puede crear o vincular un hilo en un adaptador de canal compatible (actualmente Discord)
- todos los mensajes del hilo se dirigen solo a la sesión ACP vinculada
- las salidas de ACP aparecen en la misma identidad de hilo con transmisión o lotes
- sin salida duplicada en el canal principal para turnos vinculados
- generación+vinculación+ponga en cola inicial son atómicos en el almacén persistente
- los reintentos de comandos ACP son idempotentes y no duplican ejecuciones o salidas
- cancelar, cerrar, desenfocar, archivar, restablecer y eliminar realizan una limpieza determinista
- el reinicio tras fallo preserva la asignación y reanuda la continuidad de turnos múltiples
- las sesiones ACP vinculadas a hilos concurrentes funcionan de forma independiente
- la falta de estado en el backend de ACP produce un error claro y accionable
- los enlaces obsoletos se detectan y muestran explícitamente (con una limpieza automática segura opcional)
- las métricas y los diagnósticos del plano de control están disponibles para los operadores
- nueva cobertura de pruebas unitarias, de integración y de extremo a extremo aprobadas

## Apéndice: refactorizaciones dirigidas para la implementación actual (estado)

Estos son seguimientos no bloqueantes para mantener la ruta ACP mantenible después de que aterrice el conjunto de características actual.

### 1) Centralizar la evaluación de la política de despacho ACP (completado)

- implementado mediante auxiliares de política ACP compartidos en `src/acp/policy.ts`
- el despacho, los controladores del ciclo de vida de comandos ACP y la ruta de generación ACP ahora consumen la lógica de política compartida

### 2) Dividir el controlador de comandos ACP por dominio de subcomando (completado)

- `src/auto-reply/reply/commands-acp.ts` es ahora un router delgado
- el comportamiento del subcomando se divide en:
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - ayudantes compartidos en `src/auto-reply/reply/commands-acp/shared.ts`

### 3) Dividir el administrador de sesión de ACP por responsabilidad (completado)

- el administrador se divide en:
  - `src/acp/control-plane/manager.ts` (fachada pública + singleton)
  - `src/acp/control-plane/manager.core.ts` (implementación del administrador)
  - `src/acp/control-plane/manager.types.ts` (tipos/dependencias del administrador)
  - `src/acp/control-plane/manager.utils.ts` (normalización + funciones auxiliares)

### 4) Limpieza opcional del adaptador de tiempo de ejecución de acpx

- `extensions/acpx/src/runtime.ts` se puede dividir en:
- ejecución/supervisión de procesos
- análisis/normalización de eventos nd
- superficie de la API de tiempo de ejecución (`submit`, `cancel`, `close`, etc.)
- mejora la capacidad de prueba y hace que el comportamiento del backend sea más fácil de auditar
