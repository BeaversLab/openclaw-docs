---
summary: "Referencia: reglas de saneamiento y reparación de transcripciones específicas del proveedor"
read_when:
  - Estás depurando rechazos de solicitudes del proveedor relacionados con la forma de la transcripción
  - Estás cambiando la lógica de saneamiento de transcripciones o reparación de llamadas a herramientas
  - Estás investigando discrepancias en los identificadores de llamadas a herramientas entre proveedores
title: "Higiene de transcripciones"
---

# Higiene de transcripciones (Correcciones del proveedor)

Este documento describe **correcciones específicas del proveedor** aplicadas a las transcripciones antes de una ejecución
(construcción del contexto del modelo). Estos son ajustes **en memoria** utilizados para satisfacer los requisitos
estrictos del proveedor. Estos pasos de higiene **no** reescriben la transcripción JSONL almacenada
en el disco; sin embargo, un proceso de reparación de archivos de sesión separado puede reescribir archivos JSONL malformados
descartando líneas no válidas antes de que se cargue la sesión. Cuando ocurre una reparación, el archivo
original se respalda junto con el archivo de sesión.

El alcance incluye:

- Saneamiento del id de llamada a herramienta
- Validación de entrada de llamada a herramienta
- Reparación de emparejamiento de resultados de herramientas
- Validación / ordenamiento de turnos
- Limpieza de firmas de pensamiento
- Saneamiento de carga útil de imagen
- Etiquetado de procedencia de entrada del usuario (para avisos enrutados entre sesiones)

Si necesitas detalles sobre el almacenamiento de transcripciones, consulta:

- [/reference/session-management-compaction](/es/reference/session-management-compaction)

---

## Dónde se ejecuta esto

Toda la higiene de transcripciones está centralizada en el ejecutor integrado:

- Selección de política: `src/agents/transcript-policy.ts`
- Aplicación de saneamiento/reparación: `sanitizeSessionHistory` en `src/agents/pi-embedded-runner/google.ts`

La política utiliza `provider`, `modelApi` y `modelId` para decidir qué aplicar.

Por separado de la higiene de transcripciones, los archivos de sesión se reparan (si es necesario) antes de la carga:

- `repairSessionFileIfNeeded` en `src/agents/session-file-repair.ts`
- Llamado desde `run/attempt.ts` y `compact.ts` (ejecutor integrado)

---

## Regla global: saneamiento de imágenes

Las cargas útiles de imagen siempre se sanean para evitar el rechazo del lado del proveedor debido a límites
de tamaño (reducir de tamaño/recomprimir imágenes base64 demasiado grandes).

Esto también ayuda a controlar la presión de tokens impulsada por imágenes para modelos con visión.
Dimensiones máximas más bajas generalmente reducen el uso de tokens; dimensiones más altas preservan el detalle.

Implementación:

- `sanitizeSessionMessagesImages` en `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` en `src/agents/tool-images.ts`
- El lado máximo de la imagen es configurable mediante `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`).

---

## Regla global: llamadas a herramientas malformadas

Los bloques de llamadas a herramientas del asistente que carecen tanto de `input` como de `arguments` se descartan
antes de construir el contexto del modelo. Esto evita rechazos del proveedor debido a llamadas a herramientas
parcialmente persistidas (por ejemplo, después de un fallo por límite de tasa).

Implementación:

- `sanitizeToolCallInputs` en `src/agents/session-transcript-repair.ts`
- Aplicado en `sanitizeSessionHistory` en `src/agents/pi-embedded-runner/google.ts`

---

## Regla global: procedencia de entrada entre sesiones

Cuando un agente envía un mensaje a otra sesión a través de `sessions_send` (incluyendo
pasos de respuesta/anuncio de agente a agente), OpenClaw persiste el turno de usuario creado con:

- `message.provenance.kind = "inter_session"`

Estos metadatos se escriben en el momento de anexar a la transcripción y no cambian el rol
(`role: "user"` se mantiene para la compatibilidad del proveedor). Los lectores de transcripciones pueden usar
esto para evitar tratar los mensajes internos enrutados como instrucciones escritas por el usuario final.

Durante la reconstrucción del contexto, OpenClaw también antepone un marcador `[Inter-session message]` breve
a esos turnos de usuario en memoria para que el modelo pueda distinguirlos de las
instrucciones externas del usuario final.

---

## Matriz de proveedores (comportamiento actual)

**OpenAI / OpenAI Codex**

- Solo saneamiento de imágenes.
- Descartar firmas de razonamiento huérfanas (elementos de razonamiento independientes sin un bloque de contenido siguiente) para transcripciones de OpenAI Responses/Codex.
- Sin saneamiento de id de llamada a herramienta.
- Sin reparación de emparejamiento de resultados de herramientas.
- Sin validación o reordenamiento de turnos.
- Sin resultados de herramientas sintéticos.
- Sin eliminación de firmas de pensamiento.

**Google (Generative AI / Gemini CLI / Antigravity)**

- Saneamiento de id de llamada a herramienta: solo alfanumérico estricto.
- Reparación de emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (alternancia de turnos estilo Gemini).
- Corrección del orden de turnos de Google (antepone un pequeño arranque de usuario si el historial comienza con el asistente).
- Antigravity Claude: normalizar firmas de pensamiento; descartar bloques de pensamiento sin firmar.

**Anthropic / Minimax (compatible con Anthropic)**

- Reparación del emparejamiento de resultados de herramientas y resultados de herramientas sintéticas.
- Validación de turnos (fusionar turnos de usuario consecutivos para satisfacer la alternancia estricta).

**Mistral (incluida la detección basada en model-id)**

- Saneamiento del id de llamada de herramienta: strict9 (alfanumérico de longitud 9).

**OpenRouter Gemini**

- Limpieza de firma de pensamiento: eliminar valores `thought_signature` que no sean base64 (mantener base64).

**Todo lo demás**

- Solo saneamiento de imágenes.

---

## Comportamiento histórico (antes del 2026.1.22)

Antes del lanzamiento de 2026.1.22, OpenClaw aplicaba múltiples capas de higiene de transcripción:

- Una **extensión de saneamiento de transcripción** se ejecutaba en cada construcción de contexto y podía:
  - Reparar el uso de herramientas y el emparejamiento de resultados.
  - Saneamiento de ids de llamadas de herramientas (incluyendo un modo no estricto que preservaba `_`/`-`).
- El runner también realizaba un saneamiento específico del proveedor, lo cual duplicaba el trabajo.
- Ocurrieron mutaciones adicionales fuera de la política del proveedor, incluyendo:
  - Eliminar etiquetas `<final>` del texto del asistente antes de la persistencia.
  - Eliminar turnos de error de asistente vacíos.
  - Recortar el contenido del asistente después de las llamadas a herramientas.

Esta complejidad causó regresiones entre proveedores (notablemente el emparejamiento `openai-responses`
`call_id|fc_id`). La limpieza de 2026.1.22 eliminó la extensión, centralizó la
lógica en el runner y convirtió a OpenAI en **no-touch** más allá del saneamiento de imágenes.

import es from "/components/footer/es.mdx";

<es />
