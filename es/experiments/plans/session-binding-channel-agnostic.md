---
summary: "Arquitectura de vinculación de sesión agnóstica al canal y alcance de entrega de la iteración 1"
read_when:
  - Refactorización del enrutamiento y las vinculaciones de sesión agnóstica al canal
  - Investigando entregas de sesión duplicadas, obsoletas o faltantes a través de canales
owner: "onutc"
status: "in-progress"
last_updated: "2026-02-21"
title: "Session Binding Channel Agnostic Plan"
---

# Plan de vinculación de sesión agnóstica al canal

## Resumen

Este documento define el modelo de vinculación de sesión agnóstica al canal a largo plazo y el alcance concreto para la próxima iteración de implementación.

Objetivo:

- hacer que el enrutamiento de sesión vinculado a subagentes sea una capacidad principal
- mantener el comportamiento específico del canal en los adaptadores
- evitar regresiones en el comportamiento normal de Discord

## Por qué esto existe

El comportamiento actual mezcla:

- política de contenido de completado
- política de enrutamiento de destino
- detalles específicos de Discord

Esto causó casos extremos como:

- entrega duplicada en el hilo principal y en ejecuciones concurrentes
- uso de tokens obsoletos en gestores de vinculación reutilizados
- falta de contabilidad de actividad para envíos de webhooks

## Alcance de la iteración 1

Esta iteración es intencionalmente limitada.

### 1. Agregar interfaces principales agnósticas al canal

Agregar tipos principales e interfaces de servicio para vinculaciones y enrutamiento.

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

### 2. Agregar un enrutador de entrega principal para completados de subagentes

Agregar una única ruta de resolución de destino para eventos de completado.

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

- crear/reutilizar conversaciones de hilos
- enviar mensajes vinculados mediante webhook o envío de canal
- validar el estado del hilo (archivado/eliminado)
- mapear metadatos del adaptador (identidad del webhook, ids de hilos)

### 4. Corregir problemas de corrección conocidos actualmente

Requerido en esta iteración:

- actualizar el uso del token al reutilizar el gestor de vinculación de hilo existente
- registrar la actividad saliente para envíos de Discord basados en webhooks
- detener la retirada implícita al canal principal cuando se selecciona un destino de hilo vinculado para el completado en modo de sesión

### 5. Preservar los valores predeterminados de seguridad de ejecución actuales

Sin cambio de comportamiento para los usuarios con generación vinculada a hilos deshabilitada.

Los valores predeterminados se mantienen:

- `channels.discord.threadBindings.spawnSubagentSessions = false`

Resultado:

- los usuarios normales de Discord se mantienen con el comportamiento actual
- la nueva ruta principal solo afecta el enrutamiento de finalización de sesión enlazada donde esté habilitado

## No en la iteración 1

Pospuesto explícitamente:

- objetivos de enlace ACP (`targetKind: "acp"`)
- nuevos adaptadores de canal además de Discord
- reemplazo global de todas las rutas de entrega (`spawn_ack`, futuro `subagent_message`)
- cambios a nivel de protocolo
- rediseño de migración/versiones de almacenamiento para toda la persistencia de enlaces

Notas sobre ACP:

- el diseño de la interfaz deja espacio para ACP
- la implementación de ACP no se inicia en esta iteración

## Invariantes de enrutamiento

Estos invariantes son obligatorios para la iteración 1.

- la selección del destino y la generación de contenido son pasos separados
- si la finalización en modo de sesión se resuelve en un destino enlazado activo, la entrega debe dirigirse a ese destino
- sin redirección oculta del destino enlazado al canal principal
- el comportamiento de reserva debe ser explícito y observable

## Compatibilidad y lanzamiento

Objetivo de compatibilidad:

- sin regresión para usuarios con el lanzamiento de hilos enlazados desactivado
- sin cambios en los canales que no son de Discord en esta iteración

Lanzamiento:

1. Implementar interfaces y enrutador detrás de las puertas de características actuales.
2. Enrutar las entregas enlazadas en modo de finalización de Discord a través del enrutador.
3. Mantener la ruta heredada para flujos no enlazados.
4. Verificar con pruebas específicas y registros de tiempo de ejecución canary.

## Pruebas requeridas en la iteración 1

Cobertura unitaria y de integración requerida:

- la rotación de tokens del administrador usa el token más reciente después de la reutilización del administrador
- el webhook envía actualizaciones de marcas de tiempo de actividad del canal
- dos sesiones enlazadas activas en el mismo canal solicitante no se duplican en el canal principal
- la finalización para la ejecución en modo de sesión enlazada se resuelve solo al destino del hilo
- el indicador de lanzamiento desactivado mantiene el comportamiento heredado sin cambios

## Archivos de implementación propuestos

Núcleo:

- `src/infra/outbound/session-binding-service.ts` (nuevo)
- `src/infra/outbound/bound-delivery-router.ts` (nuevo)
- `src/agents/subagent-announce.ts` (integración de resolución de destino de finalización)

Adaptador de Discord y tiempo de ejecución:

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

Pruebas:

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## Criterios de terminación para la iteración 1

- las interfaces principales existen y están conectadas para el enrutamiento de finalización
- las correcciones de corrección anteriores se combinan con las pruebas
- sin entrega de finalización duplicada en el hilo principal y en el modo de ejecución vinculado a la sesión
- sin cambio de comportamiento para los despliegues de generación vinculada deshabilitados
- ACP se mantiene explícitamente pospuesto

import en from "/components/footer/en.mdx";

<en />
