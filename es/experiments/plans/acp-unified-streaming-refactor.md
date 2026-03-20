---
summary: "Plan de refactorización del Santo Grial para una canalización de transmisión en tiempo de ejecución unificada entre main, subagent y ACP"
owner: "onutc"
status: "draft"
last_updated: "2026-02-25"
title: "Plan de refactorización de transmisión en tiempo de ejecución unificada"
---

# Plan de refactorización de transmisión en tiempo de ejecución unificada

## Objetivo

Proporcionar una canalización de transmisión compartida para `main`, `subagent` y `acp` para que todos los tiempos de ejecución tengan un comportamiento idéntico de fusión, fragmentación, orden de entrega y recuperación ante fallos.

## Por qué existe esto

- El comportamiento actual se divide entre varias rutas de conformación específicas del tiempo de ejecución.
- Los errores de formato/fusión pueden corregirse en una ruta pero persistir en otras.
- La coherencia de la entrega, la supresión de duplicados y la semántica de recuperación son más difíciles de razonar.

## Arquitectura objetivo

Una sola canalización, adaptadores específicos del tiempo de ejecución:

1. Los adaptadores de tiempo de ejecución solo emiten eventos canónicos.
2. El ensamblador de flujo compartido fusiona y finaliza los eventos de texto/herramientas/estado.
3. El proyector de canal compartido aplica la fragmentación/formato específica del canal una sola vez.
4. El libro mayor de entrega compartido hace cumplir la semántica de envío/reproducción idempotente.
5. El adaptador de canal de salida ejecuta los envíos y registra los puntos de control de entrega.

Contrato de eventos canónicos:

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

- Definir un esquema de eventos estricto + validación en el núcleo.
- Agregar pruebas de contrato de adaptador para garantizar que cada tiempo de ejecución emita eventos compatibles.
- Rechazar temprano los eventos de tiempo de ejecución malformados y mostrar diagnósticos estructurados.

### 2) Procesador de flujo compartido

- Reemplazar la lógica de fusión/proyección específica del tiempo de ejecución con un solo procesador.
- El procesador se encarga del almacenamiento en búfer de deltas de texto, el vaciado por inactividad, la división de fragmentos máximos y el vacío de finalización.
- Mover la resolución de configuración de ACP/main/subagent a un solo asistente para evitar la deriva.

### 3) Proyección de canal compartido

- Mantener los adaptadores de canal simples: aceptar bloques finalizados y enviar.
- Mover las peculiaridades de fragmentación específicas de Discord solo al proyector de canal.
- Mantener la canalización agnóstica al canal antes de la proyección.

### 4) Libro de entregas + reproducción

- Añadir IDs de entrega por turno/por fragmento.
- Registrar puntos de control antes y después del envío físico.
- Al reiniciar, reproducir los fragmentos pendientes de forma idempotente y evitar duplicados.

### 5) Migración y transición

- Fase 1: modo sombra (la nueva canalización calcula la salida pero la ruta antigua envía; comparar).
- Fase 2: transición runtime por runtime (`acp`, luego `subagent`, luego `main` o en orden inverso según el riesgo).
- Fase 3: eliminar el código de transmisión heredado específico del runtime.

## Objetivos no incluidos

- Sin cambios en el modelo de políticas/permisos de ACP en esta refactorización.
- Sin expansión de características específicas del canal fuera de las correcciones de compatibilidad de proyección.
- Sin rediseño del transporte/backend (el contrato del complemento acpx permanece tal cual a menos que sea necesario para la paridad de eventos).

## Riesgos y mitigaciones

- Riesgo: regresiones de comportamiento en las rutas main/subagent existentes.
  Mitigación: diferenciación en modo sombra + pruebas de contrato de adaptador + pruebas e2e del canal.
- Riesgo: envíos duplicados durante la recuperación tras fallos.
  Mitigación: IDs de entrega duraderos + reproducción idempotente en el adaptador de entrega.
- Riesgo: los adaptadores de runtime vuelvan a divergir.
  Mitigación: suite de pruebas de contrato compartido obligatorio para todos los adaptadores.

## Criterios de aceptación

- Todos los runtimes aprueban las pruebas de contrato de transmisión compartidas.
- Discord ACP/main/subagent producen un comportamiento de espaciado/fragmentación equivalente para deltas pequeños.
- La reproducción tras fallo/reinicio no envía ningún fragmento duplicado para el mismo ID de entrega.
- Se elimina la ruta heredada del proyector/coalescedor de ACP.
- La resolución de la configuración de transmisión es compartida e independiente del runtime.

import en from "/components/footer/en.mdx";

<en />
