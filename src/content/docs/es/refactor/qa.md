---
summary: "Plan de refactorización de QA para el catálogo de escenarios y consolidación del arnés"
read_when:
  - Refactoring QA scenario definitions or qa-lab harness code
  - Moving QA behavior between markdown scenarios and TypeScript harness logic
title: "Refactorización de QA"
---

Estado: migración fundamental completada.

## Objetivo

Mover el QA de OpenClaw desde un modelo de definición dividida a una única fuente de verdad:

- metadatos del escenario
- prompts enviados al modelo
- configuración y desmontaje
- lógica del arnés
- afirmaciones y criterios de éxito
- artefactos e indicadores de informe

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
  - enlaces de controladores (handler bindings)
  - configuración de ejecución específica del escenario
- `extensions/qa-lab/src/scenario-catalog.ts`
  - analizador de paquetes markdown + validación zod
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - renderizado de plan desde el paquete markdown
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - seeds generaron archivos de compatibilidad más `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - selecciona escenarios ejecutables a través de enlaces de controladores definidos en markdown
- protocolo de bus de QA + UI
  - archivos adjuntos en línea genéricos para el renderizado de imagen/video/audio/archivo

Superficies divididas restantes:

- `extensions/qa-lab/src/suite.ts`
  - aún posee la mayor parte de la lógica ejecutable de controladores personalizados
- `extensions/qa-lab/src/report.ts`
  - aún deriva la estructura del informe a partir de las salidas de tiempo de ejecución

Por lo tanto, la división de la fuente de verdad está solucionada, pero la ejecución sigue siendo mayormente respaldada por controladores en lugar de ser completamente declarativa.

## Cómo se ve realmente la superficie del escenario

La lectura del conjunto actual muestra algunas clases de escenarios distintas.

### Interacción simple

- línea base del canal
- línea base de MD
- seguimiento en hilo
- cambio de modelo
- seguimiento de aprobación
- reacción/edición/eliminación

### Configuración y mutación en tiempo de ejecución

- parche de configuración deshabilitar habilidad
- aplicar configuración reiniciar despertar
- cambio de capacidad de reinicio de configuración
- verificación de deriva del inventario en tiempo de ejecución

### Afirmaciones de sistema de archivos y repositorio

- informe de descubrimiento de source/docs
- construir Lobster Invaders
- búsqueda de artefacto de imagen generada

### Orquestación de memoria

- recuperación de memoria
- herramientas de memoria en el contexto del canal
- fallback de fallo de memoria
- clasificación de la memoria de la sesión
- aislamiento de la memoria del hilo
- barrido de ensoñación de memoria

### Integración de herramientas y complementos

- llamada a herramientas de complementos MCP
- visibilidad de habilidades
- instalación en caliente de habilidades
- generación de imágenes nativas
- ida y vuelta de imágenes
- comprensión de imágenes desde adjuntos

### Multivuelta y multiactor

- traspaso de subagente
- síntesis de dispersión de subagentes
- flujos de estilo de recuperación de reinicio

Estas categorías importan porque impulsan los requisitos del DSL. Una lista plana de aviso + texto esperado no es suficiente.

## Dirección

### Fuente única de verdad

Use `qa/scenarios/index.md` más `qa/scenarios/<theme>/*.md` como la fuente
única de verdad redactada.

El paquete debe permanecer:

- legible por humanos en la revisión
- analizable por máquina
- lo suficientemente rico para impulsar:
  - ejecución del conjunto
  - arranque del espacio de trabajo de QA
  - metadatos de la interfaz de usuario de QA Lab
  - avisos de documentos/descubrimiento
  - generación de informes

### Formato de redacción preferido

Use markdown como el formato de nivel superior, con YAML estructurado dentro de él.

Forma recomendada:

- frontmatter YAML
  - id
  - título
  - superficie
  - etiquetas
  - referencias de documentos
  - referencias de código
  - sobrescrituras de modelo/proveedor
  - requisitos previos
- secciones en prosa
  - objetivo
  - notas
  - sugerencias de depuración
- bloques YAML cercados
  - configuración
  - pasos
  - aserciones
  - limpieza

Esto da:

- mejor legibilidad de PR que un JSON gigante
- contexto más rico que YAML puro
- análisis estricto y validación zod

El JSON sin procesar es aceptable solo como un formulario generado intermedio.

## Forma de archivo de escenario propuesto

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

```yaml escenario.configuración
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

```yaml escenario.pasos
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

```yaml escenario.esperar
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

## Runner Capabilities The DSL Must Cover

Based on the current suite, the generic runner needs more than prompt execution.

### Environment and setup actions

- `bus.reset`
- `gateway.waitHealthy`
- `channel.waitReady`
- `session.create`
- `thread.create`
- `workspace.writeSkill`

### Agent turn actions

- `agent.send`
- `agent.wait`
- `bus.injectInbound`
- `bus.injectOutbound`

### Config and runtime actions

- `config.get`
- `config.patch`
- `config.apply`
- `gateway.restart`
- `tools.effective`
- `skills.status`

### File and artifact actions

- `file.write`
- `file.read`
- `file.delete`
- `file.touchTime`
- `artifact.captureGeneratedImage`
- `artifact.capturePath`

### Memory and cron actions

- `memory.indexForce`
- `memory.searchCli`
- `doctor.memory.status`
- `cron.list`
- `cron.run`
- `cron.waitCompletion`
- `sessionTranscript.write`

### MCP actions

- `mcp.callTool`

### Assertions

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

## Variables and Artifact References

The DSL must support saved outputs and later references.

Examples from the current suite:

- create a thread, then reuse `threadId`
- crear una sesión, luego reutilizar `sessionKey`
- generar una imagen, luego adjuntar el archivo en el siguiente turno
- generar una cadena de marcador de wake, luego afirmar que aparece más tarde

Capacidades necesarias:

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- referencias tipadas para rutas, claves de sesión, IDs de hilos, marcadores, salidas de herramientas

Sin soporte de variables, el arnés seguirá filtrando lógica de escenarios de vuelta a TypeScript.

## Qué debería mantenerse como vías de escape

Un ejecutor completamente puramente declarativo no es realista en la fase 1.

Algunos escenarios son intrínsecamente pesados en orquestación:

- barrido de soños de memoria (memory dreaming sweep)
- aplicación de configuración reinicio y despertar (config apply restart wake-up)
- cambio de capacidad de reinicio de configuración (config restart capability flip)
- resolución de artefactos de imagen generada por marca de tiempo/ruta
- evaluación del informe de descubrimiento (discovery-report evaluation)

Estos deben usar controladores personalizados explícitos por ahora.

Regla recomendada:

- 85-90% declarativo
- pasos `customHandler` explícitos para el resto difícil
- solo controladores personalizados nombrados y documentados
- sin código en línea anónimo en el archivo de escenarios

Eso mantiene el motor genérico limpio mientras aún permite el progreso.

## Cambio de arquitectura

### Actual

El markdown del escenario ya es la fuente de la verdad para:

- ejecución de suites
- archivos de arranque del espacio de trabajo (workspace)
- catálogo de escenarios de la interfaz de usuario de QA Lab
- metadatos del informe
- prompts de descubrimiento

Compatibilidad generada:

- el espacio de trabajo sembrado todavía incluye `QA_KICKOFF_TASK.md`
- el espacio de trabajo sembrado todavía incluye `QA_SCENARIO_PLAN.md`
- el espacio de trabajo sembrado ahora también incluye `QA_SCENARIOS.md`

## Plan de refactorización

### Fase 1: cargador y esquema

Hecho.

- agregado `qa/scenarios/index.md`
- escenarios divididos en `qa/scenarios/<theme>/*.md`
- agregado analizador para contenido de paquete YAML con nombre en markdown
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
- mantener las funciones auxiliares existentes como operaciones del motor

Entregable:

- el motor ejecuta escenarios declarativos simples

Comenzar con escenarios que sean mayormente prompt + espera + afirmar:

- seguimiento en hilo (threaded follow-up)
- comprensión de imágenes desde adjuntos
- visibilidad e invocación de habilidades
- línea base del canal

Entregable:

- primeros escenarios reales definidos en markdown enviando a través del motor genérico

### Fase 4: migrar escenarios medianos

- roundtrip de generación de imágenes
- herramientas de memoria en el contexto del canal
- clasificación de memoria de la sesión
- transferencia de subagente
- síntesis de expansión de subagente

Entregable:

- variables, artefactos, aserciones de herramientas, aserciones de registros de solicitudes probadas

### Fase 5: mantener escenarios difíciles en manejadores personalizados

- barrido de soñar memoria (memory dreaming sweep)
- activación tras reinicio de aplicación de configuración
- cambio de capacidad de reinicio de configuración
- deriva del inventario de tiempo de ejecución

Entregable:

- mismo formato de creación, pero con bloques de pasos personalizados explícitos donde sea necesario

### Fase 6: eliminar el mapa de escenarios codificado

Una vez que la cobertura del paquete sea lo suficientemente buena:

- eliminar la mayor parte de la ramificación específica del escenario en TypeScript de `extensions/qa-lab/src/suite.ts`

## Soporte para Slack Falso / Medios Enriquecidos

El bus de QA actual es prioridad de texto.

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

Agregar un modelo de adjunto genérico del bus de QA:

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

Luego agregar `attachments?: QaBusAttachment[]` a:

- `QaBusMessage`
- `QaBusInboundMessageInput`
- `QaBusOutboundMessageInput`

### Por qué primero genérico

No construya un modelo de medios solo para Slack.

En su lugar:

- un modelo de transporte de QA genérico
- múltiples renderizadores encima de él
  - chat actual de QA Lab
  - futura web falsa de Slack
  - cualquier otra vista de transporte falso

Esto evita la lógica duplicada y permite que los escenarios de medios permanezcan agnósticos al transporte.

### Trabajo de IU necesario

Actualizar la IU de QA para renderizar:

- vista previa de imagen en línea
- reproductor de audio en línea
- reproductor de video en línea
- chip de archivo adjunto

La IU actual ya puede renderizar hilos y reacciones, por lo que la renderización de archivos adjuntos debería superponerse al mismo modelo de tarjeta de mensaje.

### Trabajo de escenario habilitado por el transporte de medios

Una vez que los archivos adjuntos fluyan a través del bus de QA, podemos agregar escenarios de chat falso más ricos:

- respuesta de imagen en línea en Slack falso
- comprensión de archivos adjuntos de audio
- comprensión de archivos adjuntos de video
- ordenamiento mixto de archivos adjuntos
- respuesta de hilo con medios retenidos

## Recomendación

El próximo fragmento de implementación debería ser:

1. añadir cargador de escenarios markdown + esquema zod
2. generar el catálogo actual desde markdown
3. migrar primero unos pocos escenarios simples
4. añadir soporte de conexión genérica al bus de QA
5. renderizar imagen en línea en la interfaz de usuario de QA
6. luego ampliar a audio y video

Este es el camino más pequeño que demuestra ambos objetivos:

- QA genérico definido en markdown
- superficies de mensajería simuladas más ricas

## Preguntas abiertas

- si los archivos de escenarios deben permitir plantillas de prompt markdown integradas con interpolación de variables
- si la configuración/limpieza deben ser secciones con nombre o solo listas de acciones ordenadas
- si las referencias a artefactos deben estar fuertemente tipadas en el esquema o basadas en cadenas
- si los controladores personalizados deben residir en un registro único o en registros por superficie
- si el archivo de compatibilidad JSON generado debe permanecer bajo control de versiones durante la migración

## Relacionado

- [Automatización E2E de QA](/es/concepts/qa-e2e-automation)
