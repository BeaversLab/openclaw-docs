# Reestructuración de QA

Estado: la migración fundamental ha aterrizado.

## Objetivo

Mover el QA de OpenClaw desde un modelo de definición dividida a una única fuente de verdad:

- metadatos del escenario
- prompts enviados al modelo
- configuración y desmontaje
- lógica del arnés
- afirmaciones y criterios de éxito
- artefactos e pistas de informe

El estado final deseado es un arnés de QA genérico que cargue archivos de definición de escenarios potentes en lugar de codificar la mayor parte del comportamiento en TypeScript.

## Estado Actual

La fuente principal de verdad ahora vive en `qa/scenarios/index.md` además de un archivo por
escenario bajo `qa/scenarios/*.md`.

Implementado:

- `qa/scenarios/index.md`
  - metadatos canónicos del pack de QA
  - identidad del operador
  - misión de inicio
- `qa/scenarios/*.md`
  - un archivo markdown por escenario
  - metadatos del escenario
  - vinculaciones de controladores
  - configuración de ejecución específica del escenario
- `extensions/qa-lab/src/scenario-catalog.ts`
  - analizador de packs markdown + validación zod
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - renderizado de planes desde el pack markdown
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - semillas generaron archivos de compatibilidad más `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - selecciona escenarios ejecutables a través de vinculaciones de controladores definidas en markdown
- protocolo de bus de QA + interfaz de usuario
  - archivos adjuntos en línea genéricos para el renderizado de imagen/video/audio/archivo

Superficies divididas restantes:

- `extensions/qa-lab/src/suite.ts`
  - aún posee la mayor parte de la lógica ejecutable de controladores personalizados
- `extensions/qa-lab/src/report.ts`
  - aún deriva la estructura del informe a partir de las salidas de tiempo de ejecución

Así que la división de la fuente de verdad está solucionada, pero la ejecución sigue siendo mayoritariamente respaldada por controladores en lugar de ser completamente declarativa.

## Cómo se ve realmente la superficie del escenario

Leer la suite actual muestra algunas clases de escenarios distintas.

### Interacción simple

- línea base del canal
- línea base de MD
- seguimiento en hilo
- cambio de modelo
- seguimiento de aprobación
- reacción/edición/eliminación

### Configuración y mutación en tiempo de ejecución

- deshabilitar habilidad de parche de configuración
- aplicar configuración reiniciar activación
- cambio de capacidad de reinicio de configuración
- verificación de deriva del inventario en tiempo de ejecución

### Afirmaciones de sistema de archivos y repositorio

- informe de descubrimiento de fuente/documentos
- construir Lobster Invaders
- búsqueda de artefactos de imagen generados

### Orquestación de memoria

- recuerdo de memoria
- herramientas de memoria en el contexto del canal
- alternativa de fallo de memoria
- clasificación de memoria de sesión
- aislamiento de memoria de hilo
- barrido de soñar de memoria

### Integración de herramientas y complementos

- Llamada a herramientas de complementos MCP
- visibilidad de habilidades
- instalación en caliente de habilidades
- generación de imágenes nativas
- viaje de ida y vuelta de imágenes
- comprensión de imágenes desde archivos adjuntos

### Múltiples turnos y múltiples actores

- transferencia de subagente
- síntesis de expansión de subagente
- flujos de estilo de recuperación de reinicio

Estas categorías importan porque impulsan los requisitos del DSL. Una lista plana de prompt + texto esperado no es suficiente.

## Dirección

### Fuente única de verdad

Use `qa/scenarios/index.md` más `qa/scenarios/*.md` como la fuente única de
verdad escrita.

El paquete debe mantenerse:

- legible por humanos en la revisión
- analizable por máquina
- lo suficientemente rico para impulsar:
  - ejecución de suites
  - arranque del espacio de trabajo de QA
  - metadatos de la interfaz de usuario de QA Lab
  - prompts de documentos/descubrimiento
  - generación de informes

### Formato de creación preferido

Use markdown como el formato de nivel superior, con YAML estructurado dentro.

Forma recomendada:

- encabezado YAML
  - id
  - título
  - superficie
  - etiquetas
  - referencias de documentos
  - referencias de código
  - anulaciones de modelo/proveedor
  - requisitos previos
- secciones en prosa
  - objetivo
  - notas
  - sugerencias de depuración
- bloques YAML cercados
  - configuración
  - pasos
  - afirmaciones
  - limpieza

Esto proporciona:

- mejor legibilidad de PR que un JSON gigante
- un contexto más rico que el YAML puro
- análisis estricto y validación zod

El JSON sin procesar es aceptable solo como una forma generada intermedia.

## Forma de archivo de escenario propuesta

Ejemplo:

````md
---
id: image-generation-roundtrip
title: Image generation roundtrip
surface: image
tags: [media, image, roundtrip]
models:
  primary: openai/gpt-5.4
requires:
  tools: [image_generate]
  plugins: [openai, qa-channel]
docsRefs:
  - docs/help/testing.md
  - docs/concepts/model-providers.md
codeRefs:
  - extensions/qa-lab/src/suite.ts
  - src/gateway/chat-attachments.ts
---

# Objective

Verify generated media is reattached on the follow-up turn.

# Setup

```yaml scenario.setup
- action: config.patch
  patch:
    agents:
      defaults:
        imageGenerationModel:
          primary: openai/gpt-image-1
- action: session.create
  key: agent:qa:image-roundtrip
```

# Steps

```yaml scenario.steps
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    Image generation check: generate a QA lighthouse image and summarize it in one short sentence.
- action: artifact.capture
  kind: generated-image
  promptSnippet: Image generation check
  saveAs: lighthouseImage
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    Roundtrip image inspection check: describe the generated lighthouse attachment in one short sentence.
  attachments:
    - fromArtifact: lighthouseImage
```

# Expect

```yaml scenario.expect
- assert: outbound.textIncludes
  value: lighthouse
- assert: requestLog.matches
  where:
    promptIncludes: Roundtrip image inspection check
  imageInputCountGte: 1
- assert: artifact.exists
  ref: lighthouseImage
```
````

## Capacidades del ejecutor que el DSL debe cubrir

Basado en la suite actual, el ejecutor genérico necesita más que la ejecución de prompts.

### Acciones de entorno y configuración

- `bus.reset`
- `gateway.waitHealthy`
- `channel.waitReady`
- `session.create`
- `thread.create`
- `workspace.writeSkill`

### Acciones de turno del agente

- `agent.send`
- `agent.wait`
- `bus.injectInbound`
- `bus.injectOutbound`

### Acciones de configuración y tiempo de ejecución

- `config.get`
- `config.patch`
- `config.apply`
- `gateway.restart`
- `tools.effective`
- `skills.status`

### Acciones de archivo y artefacto

- `file.write`
- `file.read`
- `file.delete`
- `file.touchTime`
- `artifact.captureGeneratedImage`
- `artifact.capturePath`

### Acciones de memoria y cron

- `memory.indexForce`
- `memory.searchCli`
- `doctor.memory.status`
- `cron.list`
- `cron.run`
- `cron.waitCompletion`
- `sessionTranscript.write`

### Acciones MCP

- `mcp.callTool`

### Aserciones

- `outbound.textIncludes`
- `outbound.inThread`
- `outbound.notInRoot`
- `tool.called`
- `tool.notPresent`
- `skill.visible`
- `skill.disabled`
- `file.contains`
- `memory.contains`
- `requestLog.matches`
- `sessionStore.matches`
- `cron.managedPresent`
- `artifact.exists`

## Variables y referencias a artefactos

El DSL debe soportar salidas guardadas y referencias posteriores.

Ejemplos de la suite actual:

- crear un hilo, luego reutilizar `threadId`
- crear una sesión, luego reutilizar `sessionKey`
- generar una imagen, luego adjuntar el archivo en el siguiente turno
- generar una cadena de marcador de activación y luego afirmar que aparece más tarde

Capacidades necesarias:

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- referencias tipadas para rutas, claves de sesión, IDs de hilos, marcadores, salidas de herramientas

Sin soporte de variables, el arnés seguirá filtrando la lógica del escenario de vuelta a TypeScript.

## Qué debe quedar como vías de escape

Un ejecutor completamente declarativo y puro no es realista en la fase 1.

Algunos escenarios son intrínsecamente intensivos en orquestación:

- barrido de memoria soñadora
- configuración aplicar reiniciar activación
- reinicio de configuración cambio de capacidad
- resolución de artefacto de imagen generado por marca de tiempo/ruta
- evaluación del informe de descubrimiento

Estos deben usar controladores personalizados explícitos por ahora.

Regla recomendada:

- 85-90% declarativo
- pasos `customHandler` explícitos para el resto difícil
- solo controladores personalizados nombrados y documentados
- sin código anónimo en línea en el archivo de escenario

Eso mantiene el motor genérico limpio mientras aún permite el progreso.

## Cambio de arquitectura

### Actual

El escenario markdown ya es la fuente de verdad para:

- ejecución de suites
- archivos de arranque del espacio de trabajo
- catálogo de escenarios de QA Lab UI
- metadatos del informe
- indicaciones de descubrimiento

Compatibilidad generada:

- el espacio de trabajo sembrado todavía incluye `QA_KICKOFF_TASK.md`
- el espacio de trabajo sembrado todavía incluye `QA_SCENARIO_PLAN.md`
- el espacio de trabajo sembrado ahora también incluye `QA_SCENARIOS.md`

## Plan de refactorización

### Fase 1: cargador y esquema

Hecho.

- añadido `qa/scenarios/index.md`
- escenarios divididos en `qa/scenarios/*.md`
- añadido analizador para contenido de paquete YAML markdown nombrado
- validado con zod
- cambiados los consumidores al paquete analizado
- eliminado `qa/seed-scenarios.json` y `qa/QA_KICKOFF_TASK.md` a nivel de repositorio

### Fase 2: motor genérico

- dividir `extensions/qa-lab/src/suite.ts` en:
  - cargador
  - motor
  - registro de acciones
  - registro de afirmaciones
  - controladores personalizados
- mantener las funciones auxiliares existentes como operaciones del motor

Entregable:

- el motor ejecuta escenarios declarativos simples

Comenzar con escenarios que sean mayormente prompt + espera + afirmar:

- seguimiento en hilo
- comprensión de imágenes desde adjunto
- visibilidad e invocación de habilidades
- línea base del canal

Entregable:

- primeros escenarios reales definidos en markdown enviados a través del motor genérico

### Fase 4: migrar escenarios medianos

- ciclo completo de generación de imágenes
- herramientas de memoria en el contexto del canal
- clasificación de la memoria de la sesión
- transferencia a subagente
- síntesis de expansión de subagentes

Entregable:

- variables, artefactos, aserciones de herramientas, aserciones de registro de solicitudes comprobadas

### Fase 5: mantener los escenarios difíciles en controladores personalizados

- barrido de soñar memoria
- activación al reiniciar la aplicación de configuración
- cambio de capacidad de reinicio de configuración
- deriva del inventario en tiempo de ejecución

Entregable:

- mismo formato de creación, pero con bloques de pasos personalizados explícitos cuando sea necesario

### Fase 6: eliminar el mapa de escenarios codificados

Una vez que la cobertura del paquete sea lo suficientemente buena:

- eliminar la mayor parte de las ramificaciones específicas de escenarios de TypeScript de `extensions/qa-lab/src/suite.ts`

## Slack falso / Soporte de elementos enriquecidos

El bus de QA actual prioriza el texto.

Archivos relevantes:

- `extensions/qa-channel/src/protocol.ts`
- `extensions/qa-lab/src/bus-state.ts`
- `extensions/qa-lab/src/bus-queries.ts`
- `extensions/qa-lab/src/bus-server.ts`
- `extensions/qa-lab/web/src/ui-render.ts`

Hoy el bus de QA soporta:

- texto
- reacciones
- hilos

Todavía no modela archivos adjuntos de medios en línea.

### Contrato de transporte necesario

Añadir un modelo de archivo adjunto genérico para el bus de QA:

```ts
type QaBusAttachment = {
  id: string;
  kind: "image" | "video" | "audio" | "file";
  mimeType: string;
  fileName?: string;
  inline?: boolean;
  url?: string;
  contentBase64?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  altText?: string;
  transcript?: string;
};
```

Luego añadir `attachments?: QaBusAttachment[]` a:

- `QaBusMessage`
- `QaBusInboundMessageInput`
- `QaBusOutboundMessageInput`

### Por qué primero genérico

No construyas un modelo de medios solo para Slack.

En su lugar:

- un modelo de transporte de QA genérico
- múltiples renderizadores encima de él
  - chat de QA Lab actual
  - falso Slack web futuro
  - cualquier otra vista de transporte falso

Esto evita lógica duplicada y permite que los escenarios de medios permanezcan agnósticos al transporte.

### Trabajo de interfaz de usuario necesario

Actualizar la interfaz de usuario de QA para renderizar:

- vista previa de imagen en línea
- reproductor de audio en línea
- reproductor de video en línea
- chip de archivo adjunto

La interfaz de usuario actual ya puede renderizar hilos y reacciones, por lo que el renderizado de archivos adjuntos debería superponerse al mismo modelo de tarjeta de mensaje.

### Trabajo de escenarios habilitado por el transporte de medios

Una vez que los archivos adjuntos fluyan a través del bus de QA, podemos añadir escenarios de chat falso más ricos:

- respuesta de imagen en línea en Slack falso
- comprensión de archivos adjuntos de audio
- comprensión de archivos adjuntos de video
- ordenación mixta de archivos adjuntos
- respuesta de hilo con medios retenidos

## Recomendación

El próximo bloque de implementación debería ser:

1. añadir cargador de escenarios markdown + esquema zod
2. generar el catálogo actual desde markdown
3. migrar primero algunos escenarios simples
4. añadir soporte genérico de conexión al bus de QA
5. renderizar imagen en línea en la interfaz de usuario de QA
6. luego expandir a audio y video

Este es el camino más pequeño que demuestra ambos objetivos:

- QA genérico definido en markdown
- superficies de mensajería simuladas más ricas

## Preguntas abiertas

- si los archivos de escenarios deben permitir plantillas de aviso markdown incrustadas con interpolación de variables
- si la configuración/limpieza deben ser secciones con nombre o solo listas de acciones ordenadas
- si las referencias a artefactos deben estar fuertemente tipadas en el esquema o basadas en cadenas
- si los controladores personalizados deben vivir en un registro o en registros por superficie
- si el archivo de compatibilidad JSON generado debe permanecer verificado durante la migración
