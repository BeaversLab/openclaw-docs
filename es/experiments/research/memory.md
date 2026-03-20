---
summary: "Notas de investigación: sistema de memoria sin conexión para espacios de trabajo Clawd (Markdown como fuente de verdad + índice derivado)"
read_when:
  - Diseñar la memoria del espacio de trabajo (~/.openclaw/workspace) más allá de los registros diarios de Markdown
  - Decidiendo: CLI independiente vs integración profunda con OpenClaw
  - Añadir recuperación + reflexión sin conexión (retener/recuperar/reflexionar)
title: "Investigación de memoria del espacio de trabajo"
---

# Memoria del espacio de trabajo v2 (sin conexión): notas de investigación

Objetivo: espacio de trabajo estilo Clawd (`agents.defaults.workspace`, por defecto `~/.openclaw/workspace`) donde la "memoria" se almacena como un archivo Markdown por día (`memory/YYYY-MM-DD.md`) más un pequeño conjunto de archivos estables (p. ej. `memory.md`, `SOUL.md`).

Este documento propone una arquitectura de memoria **prioritaria sin conexión** que mantiene Markdown como la fuente canónica y revisable de verdad, pero añade **recuperación estructurada** (búsqueda, resúmenes de entidades, actualizaciones de confianza) a través de un índice derivado.

## ¿Por qué cambiar?

La configuración actual (un archivo por día) es excelente para:

- registro de "solo añadir"
- edición humana
- durabilidad y auditoría respaldadas por git
- captura de baja fricción ("simplemente escríbelo")

Es débil para:

- recuperación de alta recordación ("¿qué decidimos sobre X?", "¿la última vez que intentamos Y?")
- respuestas centradas en entidades ("cuéntame sobre Alicia / El Castillo / warelay") sin tener que releer muchos archivos
- estabilidad de opiniones/preferencias (y evidencia cuando cambian)
- restricciones de tiempo ("¿qué era cierto durante noviembre de 2025?") y resolución de conflictos

## Objetivos de diseño

- **Sin conexión**: funciona sin red; puede ejecutarse en portátil/Castle; sin dependencia de la nube.
- **Explicable**: los elementos recuperados deben ser atribuibles (archivo + ubicación) y separables de la inferencia.
- **Baja ceremonia**: el registro diario sigue siendo Markdown, sin trabajo pesado de esquema.
- **Incremental**: v1 es útil solo con FTS; semántico/vectorial y grafos son actualizaciones opcionales.
- **Amigable para agentes**: facilita la "recuperación dentro de los presupuestos de tokens" (devolver pequeños paquetes de datos).

## Modelo estelar (Hindsight × Letta)

Dos piezas para combinar:

1. **bucle de control estilo Letta/MemGPT**

- mantener un pequeño "núcleo" siempre en contexto (persona + datos clave del usuario)
- todo lo demás está fuera de contexto y se recupera mediante herramientas
- las escrituras de memoria son llamadas a herramientas explícitas (añadir/reemplazar/insertar), se persisten y luego se vuelven a inyectar en el siguiente turno

2. **Sustrato de memoria estilo Hindsight**

- separar lo que se observa vs lo que se cree vs lo que se resume
- soportar retener/recuperar/reflexionar
- opiniones con grado de confianza que pueden evolucionar con las pruebas
- recuperación consciente de entidades + consultas temporales (incluso sin grafos de conocimiento completos)

## Arquitectura propuesta (fuente de verdad en Markdown + índice derivado)

### Almacén canónico (compatible con git)

Mantener `~/.openclaw/workspace` como memoria canónica legible por humanos.

Diseño sugerido del espacio de trabajo:

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

- **El registro diario sigue siendo un registro diario**. No hay necesidad de convertirlo en JSON.
- Los archivos `bank/` están **curados**, son producidos por trabajos de reflexión y aún se pueden editar a mano.
- `memory.md` sigue siendo "pequeño + tipo núcleo": las cosas que quieres que Clawd vea en cada sesión.

### Almacén derivado (recuperación por máquina)

Añadir un índice derivado bajo el espacio de trabajo (no necesariamente rastreado por git):

```
~/.openclaw/workspace/.memory/index.sqlite
```

Respaldarlo con:

- Esquema SQLite para hechos + enlaces de entidades + metadatos de opiniones
- SQLite **FTS5** para recuperación léxica (rápido, diminuto, sin conexión)
- tabla opcional de incrustaciones (embeddings) para recuperación semántica (todavía sin conexión)

El índice siempre es **reconstruible desde Markdown**.

## Retener / Recuperar / Reflexionar (bucle operativo)

### Retener: normalizar los registros diarios en "hechos"

La idea clave de Hindsight que importa aquí: almacenar **hechos narrativos y autosuficientes**, no pequeños fragmentos.

Regla práctica para `memory/YYYY-MM-DD.md`:

- al final del día (o durante), añadir una sección `## Retain` con 2–5 viñetas que sean:
  - narrativas (se preserva el contexto entre turnos)
  - autosuficientes (tienen sentido por sí solas más tarde)
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

Si no quieres que los autores piensen en ello: el trabajo de reflexión puede inferir estas viñetas del resto del registro, pero tener una sección explícita `## Retain` es el "control de calidad" más fácil.

### Recall: consultas sobre el índice derivado

Recall debería admitir:

- **léxica**: "encontrar términos exactos / nombres / comandos" (FTS5)
- **entidad**: "cuéntame sobre X" (páginas de entidad + hechos vinculados a entidades)
- **temporal**: "qué pasó alrededor del 27 de noviembre" / "desde la semana pasada"
- **opinión**: "qué prefiere Peter?" (con confianza + evidencia)

El formato de retorno debe ser amigable para el agente y citar fuentes:

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (día de origen, o rango de tiempo extraído si está presente)
- `entities` (`["Peter","warelay"]`)
- `content` (el hecho narrativo)
- `source` (`memory/2025-11-27.md#L12` etc)

### Reflect: producir páginas estables + actualizar creencias

Reflection es un trabajo programado (diario o latido `ultrathink`) que:

- actualiza `bank/entities/*.md` a partir de hechos recientes (resúmenes de entidades)
- actualiza la confianza de `bank/opinions.md` basándose en el refuerzo/contradicción
- opcionalmente propone ediciones a `memory.md` (hechos duraderos "centrales")

Evolución de la opinión (simple, explicable):

- cada opinión tiene:
  - declaración
  - confianza `c ∈ [0,1]`
  - last_updated
  - enlaces de evidencia (IDs de hechos que respaldan + contradicen)
- cuando lleguen nuevos hechos:
  - encontrar opiniones candidatas por superposición de entidades + similitud (primero FTS, luego incrustaciones)
  - actualizar la confianza en pequeños deltas; los grandes saltos requieren una fuerte contradicción + evidencia repetida

## CLI integration: independiente vs integración profunda

Recomendación: **integración profunda en OpenClaw**, pero mantener una biblioteca central separable.

### ¿Por qué integrar en OpenClaw?

- OpenClaw ya sabe:
  - la ruta del espacio de trabajo (`agents.defaults.workspace`)
  - el modelo de sesión + latidos
  - patrones de registro + solución de problemas
- Quieres que el propio agente llame a las herramientas:
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### ¿Por qué separar aún una biblioteca?

- mantener la lógica de memoria comprobable sin puerta de enlace/tiempo de ejecución
- reutilizar de otros contextos (scripts locales, aplicación de escritorio futura, etc.)

Forma:
Las herramientas de memoria están destinadas a ser una pequeña CLI + capa de biblioteca, pero esto es solo exploratorio.

## "S-Collide" / SuCo: cuándo usarlo (investigación)

Si "S-Collide" se refiere a **SuCo (Subspace Collision)**: es un enfoque de recuperación ANN que apunta a fuertes compensaciones de recuperación/latencia mediante el uso de colisiones aprendidas/estructuradas en subespacios (artículo: arXiv 2411.14754, 2024).

Enfoque pragmático para `~/.openclaw/workspace`:

- **no empieces** con SuCo.
- comienza con SQLite FTS + (opcional) incrustaciones simples; obtendrás la mayoría de las ganancias de UX de inmediato.
- considera soluciones de clase SuCo/HNSW/ScaNN solo una vez:
  - el corpus es grande (decenas/cientos de miles de fragmentos)
  - la búsqueda de incrustaciones por fuerza bruta se vuelve demasiado lenta
  - la calidad de recuperación se limita significativamente por la búsqueda léxica

Alternativas compatibles sin conexión (en orden de complejidad creciente):

- SQLite FTS5 + filtros de metadatos (cero ML)
- Incrustaciones + fuerza bruta (funciona sorprendentemente bien si el recuento de fragmentos es bajo)
- Índice HNSW (común, robusto; necesita un enlace de biblioteca)
- SuCo (nivel de investigación; atractivo si hay una implementación sólida que puedas incrustar)

Pregunta abierta:

- ¿cuál es el **mejor** modelo de incrustación sin conexión para "memoria de asistente personal" en tus máquinas (portátil + escritorio)?
  - si ya tienes Ollama: incrusta con un modelo local; de lo contrario, envía un modelo de incrustación pequeño en la cadena de herramientas.

## Piloto útil más pequeño

Si quieres una versión mínima pero aún útil:

- Agrega páginas de entidad `bank/` y una sección `## Retain` en los registros diarios.
- Usa SQLite FTS para la recuperación con citas (ruta + números de línea).
- Agrega incrustaciones solo si la calidad de recuperación o la escala lo exigen.

## Referencias

- Conceptos de Letta / MemGPT: "bloques de memoria principal" + "memoria de archivo" + memoria de autoedición impulsada por herramientas.
- Informe técnico de Hindsight: "retener / recordar / reflejar", memoria de cuatro redes, extracción narrativa de hechos, evolución de la confianza en las opiniones.
- SuCo: arXiv 2411.14754 (2024): recuperación de vecinos más cercanos aproximados de "Subspace Collision".

import es from "/components/footer/es.mdx";

<es />
