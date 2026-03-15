---
summary: "Notas de investigación: sistema de memoria sin conexión para espacios de trabajo Clawd (fuente de verdad en Markdown + índice derivado)"
read_when:
  - Designing workspace memory (~/.openclaw/workspace) beyond daily Markdown logs
  - Deciding: standalone CLI vs deep OpenClaw integration
  - Adding offline recall + reflection (retain/recall/reflect)
title: "Investigación de memoria del espacio de trabajo"
---

# Memoria del espacio de trabajo v2 (sin conexión): notas de investigación

Objetivo: espacio de trabajo estilo Clawd (`agents.defaults.workspace`, por defecto `~/.openclaw/workspace`) donde la "memoria" se almacena como un archivo Markdown por día (`memory/YYYY-MM-DD.md`) más un pequeño conjunto de archivos estables (p. ej. `memory.md`, `SOUL.md`).

Este documento propone una arquitectura de memoria **sin conexión优先** que mantiene Markdown como la fuente de verdad canónica y revisable, pero añade **recuperación estructurada** (búsqueda, resúmenes de entidades, actualizaciones de confianza) a través de un índice derivado.

## ¿Por qué cambiar?

La configuración actual (un archivo por día) es excelente para:

- registro de "solo agregar"
- edición humana
- durabilidad y auditoría respaldadas por git
- captura de baja fricción ("simplemente escríbelo")

Es débil para:

- recuperación de alto recuerdo ("¿qué decidimos sobre X?", "¿la última vez que intentamos Y?")
- respuestas centradas en entidades ("cuéntame sobre Alicia / El Castillo / warelay") sin volver a leer muchos archivos
- estabilidad de opiniones/preferencias (y evidencia cuando cambian)
- restricciones de tiempo ("¿qué era cierto durante noviembre de 2025?") y resolución de conflictos

## Objetivos de diseño

- **Sin conexión**: funciona sin red; puede ejecutarse en portátil/Castillo; sin dependencia de la nube.
- **Explicable**: los elementos recuperados deben ser atribuibles (archivo + ubicación) y separables de la inferencia.
- **Baja ceremonia**: el registro diario se mantiene en Markdown, sin trabajo pesado de esquema.
- **Incremental**: v1 es útil solo con FTS; semántico/vectorial y grafos son actualizaciones opcionales.
- **Amigable para agentes**: facilita el "recuerdo dentro de los presupuestos de tokens" (retorna pequeños paquetes de datos).

## Modelo estrella polar (Hindsight × Letta)

Dos piezas para combinar:

1. **bucle de control estilo Letta/MemGPT**

- mantener un "núcleo" pequeño siempre en contexto (persona + datos clave del usuario)
- todo lo demás está fuera de contexto y se recupera mediante herramientas
- las escrituras en memoria son llamadas a herramientas explícitas (agregar/reemplazar/insertar), persisten y luego se vuelven a inyectar en el siguiente turno

2. **sustrato de memoria estilo Hindsight**

- separar lo que se observa vs lo que se cree vs lo que se resume
- soporte para retain/recall/reflect
- opiniones con nivel de confianza que pueden evolucionar con la evidencia
- recuperación con conocimiento de entidades + consultas temporales (incluso sin grafos de conocimiento completos)

## Arquitectura propuesta (fuente de verdad en Markdown + índice derivado)

### Almacén canónico (compatible con git)

Mantener `~/.openclaw/workspace` como memoria canónica legible por humanos.

Distribución del espacio de trabajo sugerida:

```
~/.openclaw/workspace/
  memory.md                    # small: durable facts + preferences (core-ish)
  memory/
    YYYY-MM-DD.md              # daily log (append; narrative)
  bank/                        # “typed” memory pages (stable, reviewable)
    world.md                   # objective facts about the world
    experience.md              # what the agent did (first-person)
    opinions.md                # subjective prefs/judgments + confidence + evidence pointers
    entities/
      Peter.md
      The-Castle.md
      warelay.md
      ...
```

Notas:

- **El registro diario sigue siendo un registro diario**. No es necesario convertirlo a JSON.
- Los archivos `bank/` están **curados**, son producidos por trabajos de reflexión y aún se pueden editar manualmente.
- `memory.md` sigue siendo “pequeño y central”: las cosas que quieres que Clawd vea en cada sesión.

### Almacén derivado (recuperación de máquina)

Añadir un índice derivado bajo el espacio de trabajo (no necesariamente rastreado por git):

```
~/.openclaw/workspace/.memory/index.sqlite
```

Respaldado por:

- Esquema SQLite para hechos + enlaces de entidades + metadatos de opiniones
- SQLite **FTS5** para recuperación léxica (rápido, diminuto, sin conexión)
- tabla opcional de embeddings para recuperación semántica (todavía sin conexión)

El índice siempre es **reconstruible desde Markdown**.

## Retain / Recall / Reflect (bucle operativo)

### Retain: normalizar registros diarios en “hechos”

La idea clave de Hindsight que importa aquí: almacenar **hechos narrativos y autónomos**, no fragmentos diminutos.

Regla práctica para `memory/YYYY-MM-DD.md`:

- al final del día (o durante), añadir una sección `## Retain` con 2-5 viñetas que sean:
  - narrativas (se preserva el contexto entre turnos)
  - autónomas (tienen sentido por sí solas más adelante)
  - etiquetadas con tipo + menciones de entidades

Ejemplo:

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

Análisis mínimo:

- Prefijo de tipo: `W` (mundo), `B` (experiencia/biográfico), `O` (opinión), `S` (observación/resumen; generalmente generado)
- Entidades: `@Peter`, `@warelay`, etc (los slugs se asignan a `bank/entities/*.md`)
- Confianza de la opinión: `O(c=0.0..1.0)` opcional

Si no quieres que los autores piensen en ello: el trabajo de reflexión puede inferir estas viñetas del resto del registro, pero tener una sección `## Retain` explícita es el “control de calidad” más fácil.

### Recall: consultas sobre el índice derivado

Recall debe soportar:

- **léxico**: “encontrar términos exactos / nombres / comandos” (FTS5)
- **entidad**: “cuéntame sobre X” (páginas de entidad + hechos vinculados a entidades)
- **temporal**: “qué pasó alrededor del 27 de noviembre” / “desde la semana pasada”
- **opinión**: “qué prefiere Peter?” (con confianza + evidencia)

El formato de retorno debe ser amigable para el agente y citar fuentes:

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (día de origen, o rango de tiempo extraído si está presente)
- `entities` (`["Peter","warelay"]`)
- `content` (el hecho narrativo)
- `source` (`memory/2025-11-27.md#L12` etc)

### Reflexión: producir páginas estables + actualizar creencias

La reflexión es un trabajo programado (diario o latido `ultrathink`) que:

- actualiza `bank/entities/*.md` a partir de hechos recientes (resúmenes de entidades)
- actualiza la confianza de `bank/opinions.md` basándose en refuerzo/contradicción
- opcionalmente propone ediciones a `memory.md` (hechos duraderos “centrales”)

Evolución de la opinión (simple, explicable):

- cada opinión tiene:
  - declaración
  - confianza `c ∈ [0,1]`
  - última_actualización
  - enlaces de evidencia (IDs de hechos de apoyo + contradictorios)
- cuando llegan nuevos hechos:
  - encontrar opiniones candidatas por superposición de entidades + similitud (FTS primero, incrustaciones después)
  - actualizar la confianza en pequeños deltas; los grandes saltos requieren una fuerte contradicción + evidencia repetida

## Integración CLI: independiente vs. integración profunda

Recomendación: **integración profunda en OpenClaw**, pero mantener una biblioteca central separable.

### ¿Por qué integrar en OpenClaw?

- OpenClaw ya sabe:
  - la ruta del espacio de trabajo (`agents.defaults.workspace`)
  - el modelo de sesión + latidos
  - patrones de registro + resolución de problemas
- Quieres que el agente mismo llame a las herramientas:
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### ¿Por qué todavía dividir una biblioteca?

- mantener la lógica de memoria comprobable sin puerta de enlace/tiempo de ejecución
- reutilizar desde otros contextos (scripts locales, aplicación de escritorio futura, etc.)

Forma:
Las herramientas de memoria pretenden ser una pequeña capa de CLI + biblioteca, pero esto es solo exploratorio.

## “S-Collide” / SuCo: cuándo usarlo (investigación)

Si “S-Collide” se refiere a **SuCo (Subspace Collision)**: es un enfoque de recuperación ANN que busca un equilibrio sólido entre recuperación y latencia mediante el uso de colisiones aprendidas/estructuradas en subespacios (artículo: arXiv 2411.14754, 2024).

Enfoque pragmático para `~/.openclaw/workspace`:

- **no comiences** con SuCo.
- comienza con SQLite FTS + (opcional) incrustaciones simples; obtendrás la mayoría de las mejoras en la experiencia de usuario de inmediato.
- considera soluciones de la clase SuCo/HNSW/ScaNN solo una vez que:
  - el corpus sea grande (decenas/cientos de miles de fragmentos)
  - la búsqueda de fuerza bruta de incrustaciones se vuelva demasiado lenta
  - la calidad de la recuperación se vea limitada de manera significativa por la búsqueda léxica

Alternativas compatibles con sin conexión (en orden de complejidad creciente):

- SQLite FTS5 + filtros de metadatos (cero ML)
- Incrustaciones + fuerza bruta (funciona sorprendentemente bien si el recuento de fragmentos es bajo)
- Índice HNSW (común, robusto; necesita un enlace de biblioteca)
- SuCo (nivel de investigación; atractivo si hay una implementación sólida que puedas integrar)

Pregunta abierta:

- ¿cuál es el **mejor** modelo de incrustación sin conexión para “memoria de asistente personal” en tus máquinas (portátil + escritorio)?
  - si ya tienes Ollama: incrusta con un modelo local; de lo contrario, incluye un pequeño modelo de incrustación en la cadena de herramientas.

## El piloto útil más pequeño

Si deseas una versión mínima pero aún útil:

- Agrega páginas de entidades `bank/` y una sección `## Retain` en los registros diarios.
- Usa SQLite FTS para la recuperación con citas (ruta + números de línea).
- Agrega incrustaciones solo si la calidad o la escala de la recuperación lo demanda.

## Referencias

- Conceptos de Letta / MemGPT: “bloques de memoria principal” + “memoria de archivo” + memoria de autoedición impulsada por herramientas.
- Informe Técnico de Hindsight: “retain / recall / reflect”, memoria de cuatro redes, extracción narrativa de hechos, evolución de la confianza en las opiniones.
- SuCo: arXiv 2411.14754 (2024): recuperación de vecinos aproximados “Subspace Collision”.

import es from "/components/footer/es.mdx";

<es />
