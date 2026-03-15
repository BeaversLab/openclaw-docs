---
summary: "Arquitectura de enlace de sesión agnóstica al canal y alcance de entrega de la iteración 1"
read_when:
  - Refactoring channel-agnostic session routing and bindings
  - Investigating duplicate, stale, or missing session delivery across channels
owner: "onutc"
status: "en curso"
last_updated: "2026-02-21"
title: "Plan de enlace de sesión agnóstico al canal"
---

# Plan de enlace de sesión agnóstico al canal

## Resumen

Este documento define el modelo de enlace de sesión agnóstico al canal a largo plazo y el alcance concreto para la próxima iteración de implementación.

Objetivo:

- hacer que el enrutamiento de sesiones vinculadas a subagentes sea una capacidad principal
- mantener el comportamiento específico del canal en los adaptadores
- evitar regresiones en el comportamiento normal de Discord

## Por qué existe esto

El comportamiento actual mezcla:

- política de contenido de finalización
- política de enrutamiento de destino
- detalles específicos de Discord

Esto causó casos extremos tales como:

- entrega duplicada en el hilo principal y en subprocesos durante ejecuciones simultáneas
- uso de tokens obsoletos en gestores de enlace reutilizados
- falta de contabilidad de actividad para envíos vía webhook

## Alcance de la iteración 1

Esta iteración está intencionalmente limitada.

### 1. Añadir interfaces principales agnósticas al canal

Añadir tipos principales e interfaces de servicio para enlaces y enrutamiento.

Tipos principales propuestos:

```ts
export type BindingTargetKind = "subagent" | "session";
export type BindingStatus = "active" | "ending" | "ended";

export type ConversationRef = {
  channel: string;
  accountId: string;
  conversationId: string;
  parentConversationId?: string;
};

export type SessionBindingRecord = {
  bindingId: string;
  targetSessionKey: string;
  targetKind: BindingTargetKind;
  conversation: ConversationRef;
  status: BindingStatus;
  boundAt: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
};
```

Contrato de servicio principal:

```ts
export interface SessionBindingService {
  bind(input: {
    targetSessionKey: string;
    targetKind: BindingTargetKind;
    conversation: ConversationRef;
    metadata?: Record<string, unknown>;
    ttlMs?: number;
  }): Promise<SessionBindingRecord>;

  listBySession(targetSessionKey: string): SessionBindingRecord[];
  resolveByConversation(ref: ConversationRef): SessionBindingRecord | null;
  touch(bindingId: string, at?: number): void;
  unbind(input: {
    bindingId?: string;
    targetSessionKey?: string;
    reason: string;
  }): Promise<SessionBindingRecord[]>;
}
```

### 2. Añadir un enrutador de entrega principal para finalizaciones de subagentes

Añadir una única ruta de resolución de destino para eventos de finalización.

Contrato del enrutador:

```ts
export interface BoundDeliveryRouter {
  resolveDestination(input: {
    eventKind: "task_completion";
    targetSessionKey: string;
    requester?: ConversationRef;
    failClosed: boolean;
  }): {
    binding: SessionBindingRecord | null;
    mode: "bound" | "fallback";
    reason: string;
  };
}
```

Para esta iteración:

- solo `task_completion` se enruta a través de esta nueva ruta
- las rutas existentes para otros tipos de eventos permanecen tal como están

### 3. Mantener Discord como adaptador

Discord sigue siendo la primera implementación del adaptador.

Responsabilidades del adaptador:

- crear/reutilizar conversaciones en hilos
- enviar mensajes vinculados a través de webhook o envío al canal
- validar el estado del hilo (archivado/eliminado)
- mapear metadatos del adaptador (identidad del webhook, ids de hilos)

### 4. Corregir los problemas de corrección conocidos actualmente

Requerido en esta iteración:

- actualizar el uso del token al reutilizar el gestor de enlace de hilo existente
- registrar la actividad saliente para envíos de Discord basados en webhooks
- detener la reserva implícita al canal principal cuando se selecciona un destino de hilo vinculado para la finalización en modo de sesión

### 5. Preservar los valores predeterminados de seguridad en tiempo de ejecución actuales

No hay cambios de comportamiento para los usuarios con el spawn vinculado a hilos deshabilitado.

Los valores predeterminados se mantienen:

- `channels.discord.threadBindings.spawnSubagentSessions = false`

Resultado:

- los usuarios normales de Discord se mantienen en el comportamiento actual
- la nueva ruta principal afecta solo el enrutamiento de finalizaciones de sesión vinculadas donde está habilitado

## No en la iteración 1

Explícitamente diferido:

- objetivos de vinculación de ACP (`targetKind: "acp"`)
- nuevos adaptadores de canal más allá de Discord
- reemplazo global de todas las rutas de entrega (`spawn_ack`, futuro `subagent_message`)
- cambios a nivel de protocolo
- rediseño de migración/versiones de almacenamiento para toda la persistencia de vinculación

Notas sobre ACP:

- el diseño de la interfaz deja espacio para ACP
- la implementación de ACP no se inicia en esta iteración

## Invariantes de enrutamiento

Estos invariantes son obligatorios para la iteración 1.

- la selección de destino y la generación de contenido son pasos separados
- si la finalización del modo de sesión se resuelve a un destino vinculado activo, la entrega debe dirigirse a ese destino
- sin redirección oculta del destino vinculado al canal principal
- el comportamiento de reserva debe ser explícito y observable

## Compatibilidad e implementación

Objetivo de compatibilidad:

- sin regresión para los usuarios con el spawn vinculado a hilos desactivado
- sin cambios en los canales que no sean Discord en esta iteración

Implementación:

1. Incluir las interfaces y el enrutador detrás de las puertas de características actuales.
2. Enrutar las entregas vinculadas del modo de finalización de Discord a través del enrutador.
3. Mantener la ruta heredada para flujos no vinculados.
4. Verificar con pruebas específicas y registros de tiempo de ejecución canary.

## Pruebas requeridas en la iteración 1

Cobertura unitaria y de integración requerida:

- la rotación de tokens del administrador usa el token más reciente después de reutilizar el administrador
- el webhook envía actualizaciones de marcas de tiempo de actividad del canal
- dos sesiones vinculadas activas en el mismo canal solicitante no se duplican en el canal principal
- la finalización para la ejecución del modo de sesión vinculada se resuelve solo al destino del hilo
- el indicador de spawn deshabilitado mantiene el comportamiento heredado sin cambios

## Archivos de implementación propuestos

Core:

- `src/infra/outbound/session-binding-service.ts` (nuevo)
- `src/infra/outbound/bound-delivery-router.ts` (nuevo)
- `src/agents/subagent-announce.ts` (integración de resolución de destino de finalización)

Adaptador y tiempo de ejecución de Discord:

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

Pruebas:

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## Criterios de terminación para la iteración 1

- las interfaces principales existen y están conectadas para el enrutamiento de finalizaciones
- las correcciones de corrección anteriores se han fusionado con pruebas
- no hay entrega de finalización duplicada en el hilo principal en ejecuciones enlazadas en modo de sesión
- ningún cambio de comportamiento para los despliegues de generación enlazada deshabilitados
- ACP sigue explícitamente aplazado

import es from "/components/footer/es.mdx";

<es />
