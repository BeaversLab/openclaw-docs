---
summary: "Plan de refactorización del Santo Grial para una canalización de transmisión de tiempo de ejecución unificada entre principal, subagente y ACP"
owner: "onutc"
status: "borrador"
last_updated: "2026-02-25"
title: "Plan de refactorización de transmisión unificada del tiempo de ejecución"
---

# Plan de refactorización de transmisión unificada del tiempo de ejecución

## Objetivo

Entregar una canalización de transmisión compartida para `main`, `subagent` y `acp` para que todos los tiempos de ejecución obtengan un comportamiento idéntico de fusión, fragmentación, orden de entrega y recuperación ante fallos.

## Por qué existe esto

- El comportamiento actual está dividido en varias rutas de conformación específicas del tiempo de ejecución.
- Los errores de formato/fusión pueden corregirse en una ruta pero persistir en otras.
- La coherencia de la entrega, la supresión de duplicados y la semántica de recuperación son más difíciles de razonar.

## Arquitectura objetivo

Una sola canalización, adaptadores específicos del tiempo de ejecución:

1. Los adaptadores de tiempo de ejecución solo emiten eventos canónicos.
2. El ensamblador de transmisión compartido fusiona y finaliza eventos de texto/herramienta/estado.
3. El proyector de canal compartido aplica el formateo/fragmentación específico del canal una sola vez.
4. El libro mayor de entrega compartido impone semántica de envío/reproducción idempotente.
5. El adaptador de canal de salida ejecuta los envíos y registra los puntos de control de entrega.

Contrato de evento canónico:

- `turn_started`
- `text_delta`
- `block_final`
- `tool_started`
- `tool_finished`
- `status`
- `turn_completed`
- `turn_failed`
- `turn_cancelled`

## Flujos de trabajo

### 1) Contrato de transmisión canónico

- Definir un esquema de evento estricto + validación en el núcleo.
- Agregar pruebas de contrato de adaptador para garantizar que cada tiempo de ejecución emita eventos compatibles.
- Rechazar eventos de tiempo de ejecución malformados en una etapa temprana y mostrar diagnósticos estructurados.

### 2) Procesador de transmisión compartido

- Reemplazar la lógica del fusor/proyector específica del tiempo de ejecución con un solo procesador.
- El procesador gestiona el almacenamiento en búfer de deltas de texto, el vaciado por inactividad, la división de fragmentos máximos y el vaciado al completar.
- Mueva la resolución de configuración de ACP/main/subagent a un solo asistente para evitar la deriva.

### 3) Proyección de canal compartida

- Mantenga los adaptadores de canal simples: acepten bloques finalizados y envíenlos.
- Mueva las peculiaridades de fragmentación específicas de Discord solo al proyector de canal.
- Mantenga la canalización agnóstica al canal antes de la proyección.

### 4) Libro mayor de entrega + reproducción

- Agregue ID de entrega por turno/por fragmento.
- Registre puntos de control antes y después del envío físico.
- Al reiniciar, reproduzca los fragmentos pendientes de manera idempotente y evite duplicados.

### 5) Migración y transición

- Fase 1: modo sombra (la nueva canalización calcula la salida pero la ruta antigua envía; comparar).
- Fase 2: transición runtime por runtime (`acp`, luego `subagent`, luego `main` o inversa según el riesgo).
- Fase 3: elimine el código de transmisión heredado específico del runtime.

## No objetivos

- No se realizan cambios en el modelo de políticas/permisos de ACP en esta refactorización.
- Sin expansión de funciones específicas del canal fuera de las correcciones de compatibilidad de proyección.
- Sin rediseño de transporte/backend (el contrato del complemento acpx permanece tal como está, a menos que sea necesario para la paridad de eventos).

## Riesgos y mitigaciones

- Riesgo: regresiones de comportamiento en las rutas existentes de main/subagent.
  Mitigación: diferenciación en modo sombra + pruebas de contrato de adaptador + pruebas e2e del canal.
- Riesgo: envíos duplicados durante la recuperación de fallas.
  Mitigación: ID de entrega duraderos + reproducción idempotente en el adaptador de entrega.
- Riesgo: los adaptadores de runtime divergen nuevamente.
  Mitigación: suite de pruebas de contrato compartido obligatorio para todos los adaptadores.

## Criterios de aceptación

- Todos los runtimes aprueban las pruebas de contrato de transmisión compartidas.
- Discord ACP/main/subagent producen un comportamiento de espaciado/fragmentación equivalente para deltas pequeños.
- La reproducción de fallas/reinicios no envía ningún fragmento duplicado para el mismo ID de entrega.
- Se elimina la ruta heredada del proyector/agrupador de ACP.
- La resolución de configuración de transmisión es compartida e independiente del runtime.
