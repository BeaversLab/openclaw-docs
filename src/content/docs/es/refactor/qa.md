---
summary: "Plan de refactorización de QA para el catálogo de escenarios y consolidación del arnés"
read_when:
  - Refactoring QA scenario definitions or qa-lab harness code
  - Moving QA behavior between markdown scenarios and TypeScript harness logic
title: "Refactorización de QA"
---

# Refactorización de QA

Estado: migración fundamental completada.

## Objetivo

Mover OpenClaw QA desde un modelo de definición dividida a una única fuente de verdad:

- metadatos del escenario
- indicaciones enviadas al modelo
- configuración y desmontaje
- lógica del arnés
- afirmaciones y criterios de éxito
- artefactos e pistas de informe

El estado final deseado es un arnés de QA genérico que cargue archivos de definición de escenarios potentes en lugar de codificar la mayor parte del comportamiento en TypeScript.

## Estado actual

La fuente principal de verdad ahora reside en `qa/scenarios/index.md` más un archivo por
escenario bajo `qa/scenarios/<theme>/*.md`.

Implementado:

- `qa/scenarios/index.md`
  - metadatos canónicos del pack de QA
  - identidad del operador
  - misión de inicio
- `qa/scenarios/<theme>/*.md`
  - un archivo markdown por escenario
  - metadatos del escenario
  - enlaces de manejadores (handler bindings)
  - configuración de ejecución específica del escenario
- `extensions/qa-lab/src/scenario-catalog.ts`
  - analizador de pack markdown + validación zod
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - renderizado del plan desde el pack markdown
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - seeds generó archivos de compatibilidad más `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - selecciona escenarios ejecutables a través de enlaces de manejadores definidos en markdown
- protocolo de bus de QA + UI
  - archivos adjuntos genéricos en línea para el renderizado de imagen/video/audio/archivo

Superficies divididas restantes:

- `extensions/qa-lab/src/suite.ts`
  - aún posee la mayor parte de la lógica ejecutable de manejadores personalizados
- `extensions/qa-lab/src/report.ts`
  - aún deriva la estructura del informe desde las salidas de tiempo de ejecución

Por lo tanto, la división de la fuente de verdad está resuelta, pero la ejecución sigue siendo mayormente respaldada por manejadores en lugar de ser totalmente declarativa.

## Aspecto real de la superficie del escenario

Leer la suite actual muestra algunas clases de escenarios distintas.

### Interacción simple

- línea base del canal
- línea base de MD
- seguimiento en hilo
- cambio de modelo
- seguimiento de aprobación
- reacción/edición/eliminación

### Configuración y mutación en tiempo de ejecución

- parche de configuración deshabilitar habilidad
- aplicación de configuración reinicio activación
- reinicio de configuración cambio de capacidad
- verificación de deriva del inventario en tiempo de ejecución

### Afirmaciones de sistema de archivos y repositorio

- informe de descubrimiento de fuente/docs
- construir Lobster Invaders
- búsqueda de artefactos de imágenes generadas

### Orquestación de memoria

- recuperación de memoria
- herramientas de memoria en el contexto del canal
- respaldo en caso de fallo de memoria
- clasificación de memoria de sesión
- aislamiento de memoria de hilo
- barrido de soñar de memoria (memory dreaming sweep)

### Integración de herramientas y complementos

- llamada a herramientas de complementos MCP
- visibilidad de habilidades (skills)
- instalación en caliente de habilidades (skills)
- generación de imágenes nativas
- viaje de ida y vuelta de imagen
- comprensión de imágenes desde adjuntos

### Múltiples turnos y múltiples actores

- transferencia a subagente
- síntesis de expansión de subagente
- flujos de estilo de recuperación de reinicio

Estas categorías importan porque impulsan los requisitos del DSL. Una lista plana de prompt + texto esperado no es suficiente.

## Dirección

### Fuente única de verdad

Use `qa/scenarios/index.md` más `qa/scenarios/<theme>/*.md` como la fuente de verdad creada.

El paquete debe mantenerse:

- legible por humanos en revisión
- analizable por máquina
- lo suficientemente rico para impulsar:
  - ejecución de suites
  - arranque del espacio de trabajo de QA
  - metadatos de la interfaz de usuario de QA Lab
  - prompts de documentos/descubrimiento
  - generación de informes

### Formato de creación preferido

Use markdown como el formato de nivel superior, con YAML estructurado en su interior.

Forma recomendada:

- frontmatter YAML
  - id
  - título
  - superficie
  - etiquetas
  - referencias de documentación
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

Basado en el conjunto actual, el ejecutor genérico necesita más que la ejecución de prompts.

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

### Acciones de archivos y artefactos

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

El DSL debe admitir salidas guardadas y referencias posteriores.

Ejemplos de la suite actual:

- crear un hilo, luego reutilizar `threadId`
- crear una sesión, luego reutilizar `sessionKey`
- generar una imagen, luego adjuntar el archivo en el siguiente turno
- generar una cadena de marcador de wake (wake marker), luego afirmar que aparece más tarde

Capacidades necesarias:

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- referencias tipadas para rutas, claves de sesión, ids de hilo, marcadores, salidas de herramientas

Sin soporte de variables, el harness seguirá filtrando lógica de escenarios de vuelta a TypeScript.

## Lo Qué Debe Permanecer Como Escapes (Escape Hatches)

Un ejecutor completamente puramente declarativo no es realista en la fase 1.

Algunos escenarios son intrínsecamente pesados en orquestación:

- barrido de memory dreaming
- config apply restart wake-up
- config restart capability flip
- resolución de artefacto de imagen generada por marca de tiempo/ruta
- evaluación de discovery-report

Estos deben usar controladores personalizados explícitos por ahora.

Regla recomendada:

- 85-90% declarativo
- pasos `customHandler` explícitos para el resto difícil
- solo controladores personalizados nombrados y documentados
- sin código en línea anónimo en el archivo de escenario

Eso mantiene el motor genérico limpio mientras todavía permite el progreso.

## Cambio de Arquitectura

### Actual

El markdown del escenario ya es la fuente de verdad para:

- ejecución de suite
- archivos de arranque del espacio de trabajo (workspace bootstrap)
- catálogo de escenarios de QA Lab UI
- metadatos del reporte
- prompts de descubrimiento (discovery prompts)

Compatibilidad generada:

- el espacio de trabajo sembrado todavía incluye `QA_KICKOFF_TASK.md`
- el espacio de trabajo sembrado todavía incluye `QA_SCENARIO_PLAN.md`
- el espacio de trabajo sembrado ahora también incluye `QA_SCENARIOS.md`

## Plan de Refactorización

### Fase 1: cargador y esquema

Hecho.

- agregado `qa/scenarios/index.md`
- escenarios divididos en `qa/scenarios/<theme>/*.md`
- agregado analizador para contenido de paquete YAML markdown nombrado
- validado con zod
- cambiados los consumidores al paquete analizado
- eliminados `qa/seed-scenarios.json` y `qa/QA_KICKOFF_TASK.md` a nivel de repositorio

### Fase 2: motor genérico

- dividir `extensions/qa-lab/src/suite.ts` en:
  - cargador
  - motor
  - registro de acciones
  - registro de afirmaciones
  - controladores personalizados
- mantener funciones auxiliares existentes como operaciones del motor

Entregable:

- el motor ejecuta escenarios declarativos simples

Comience con escenarios que sean principalmente prompt + espera + aserción:

- seguimiento en hilo
- comprensión de imágenes desde archivos adjuntos
- visibilidad y invocación de habilidades
- línea base del canal

Entregable:

- primeros escenarios reales definidos en markdown enviados a través del motor genérico

### Fase 4: migrar escenarios medianos

- ida y vuelta de generación de imágenes
- herramientas de memoria en el contexto del canal
- clasificación de memoria de sesión
- transferencia a subagente
- síntesis de distribución en abanico de subagentes

Entregable:

- variables, artefactos, aserciones de herramientas, aserciones de registros de solicitudes comprobados

### Fase 5: mantener escenarios difíciles en controladores personalizados

- barrido de "memory dreaming"
- activación tras reinicio de aplicación de configuración
- cambio de capacidad de reinicio de configuración
- desviación del inventario en tiempo de ejecución

Entregable:

- mismo formato de creación, pero con bloques de pasos personalizados explícitos cuando sea necesario

### Fase 6: eliminar el mapa de escenarios codificado

Una vez que la cobertura del paquete sea lo suficientemente buena:

- eliminar la mayor parte de las ramificaciones específicas de escenarios en TypeScript de `extensions/qa-lab/src/suite.ts`

## Slack falso / Soporte de medios enriquecidos

El bus de QA actual da prioridad al texto.

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

Aún no modela archivos adjuntos de medios en línea.

### Contrato de transporte necesario

Añadir un modelo de archivo adjunto de bus de QA genérico:

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

No construya un modelo de medios solo para Slack.

En su lugar:

- un modelo de transporte de QA genérico
- múltiples renderizadores encima de él
  - chat actual de QA Lab
  - falso Slack web futuro
  - cualquier otra vista de transporte falso

Esto evita la lógica duplicada y permite que los escenarios de medios se mantengan agnósticos al transporte.

### Trabajo de interfaz de usuario necesario

Actualice la interfaz de usuario de QA para renderizar:

- vista previa de imagen en línea
- reproductor de audio en línea
- reproductor de video en línea
- chip de archivo adjunto

La interfaz de usuario actual ya puede representar hilos y reacciones, por lo que la representación de archivos adjuntos debería superponerse al mismo modelo de tarjeta de mensaje.

### Trabajo de escenarios habilitado por el transporte de medios

Una vez que los archivos adjuntos fluyan a través del bus de QA, podemos añadir escenarios de chat falsos más ricos:

- respuesta de imagen en línea en Slack falso
- comprensión de archivos adjuntos de audio
- comprensión de archivos adjuntos de video
- orden de adjuntos mixtos
- respuesta del hilo con medios retenidos

## Recomendación

El siguiente bloque de implementación debería ser:

1. añadir cargador de escenarios markdown + esquema zod
2. generar el catálogo actual desde markdown
3. migrar primero unos pocos escenarios simples
4. añadir soporte genérico de adjuntos de bus de QA
5. renderizar imagen en línea en la interfaz de usuario de QA
6. luego expandir a audio y video

Este es el camino más pequeño que prueba ambos objetivos:

- QA genérica definida en markdown
- superficies de mensajería simuladas más ricas

## Preguntas abiertas

- si los archivos de escenarios deben permitir plantillas de indicaciones (prompts) markdown incrustadas con interpolación de variables
- si la configuración/limpieza debe ser secciones con nombre o solo listas de acciones ordenadas
- si las referencias de artefactos deben tener tipos fuertes en el esquema o basarse en cadenas
- si los controladores personalizados deben residir en un registro o en registros por superficie
- si el archivo de compatibilidad JSON generado debe permanecer comprobado (checked in) durante la migración
