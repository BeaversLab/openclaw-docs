---
summary: "Referencia: reglas de saneamiento y reparación de transcripciones específicas del proveedor"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Higiene de la Transcripción"
---

# Higiene de la Transcripción (Correcciones del Proveedor)

Este documento describe las **correcciones específicas del proveedor** aplicadas a las transcripciones antes de una ejecución
(construcción del contexto del modelo). Estos son ajustes **en memoria** utilizados para cumplir con los estrictos
requisitos del proveedor. Estos pasos de higiene **no** reescriben la transcripción JSONL almacenada
en el disco; sin embargo, una pasada de reparación de archivo de sesión separada puede reescribir archivos JSONL malformados
descartando líneas no válidas antes de que se cargue la sesión. Cuando ocurre una reparación, el archivo
original se respalda junto con el archivo de sesión.

El alcance incluye:

- Saneamiento del id de llamada de herramienta
- Validación de entrada de llamada de herramienta
- Reparación del emparejamiento de resultados de herramienta
- Validación / ordenamiento de turnos
- Limpieza de firma de pensamiento
- Saneamiento de carga de imágenes
- Etiquetado de procedencia de entrada de usuario (para prompts enrutados entre sesiones)

Si necesita detalles sobre el almacenamiento de transcripciones, consulte:

- [/reference/session-management-compaction](/es/reference/session-management-compaction)

---

## Dónde se ejecuta esto

Toda la higiene de la transcripción está centralizada en el ejecutor integrado:

- Selección de política: `src/agents/transcript-policy.ts`
- Aplicación de saneamiento/reparación: `sanitizeSessionHistory` en `src/agents/pi-embedded-runner/google.ts`

La política utiliza `provider`, `modelApi` y `modelId` para decidir qué aplicar.

Por separado de la higiene de la transcripción, los archivos de sesión se reparan (si es necesario) antes de cargar:

- `repairSessionFileIfNeeded` en `src/agents/session-file-repair.ts`
- Llamado desde `run/attempt.ts` y `compact.ts` (ejecutor integrado)

---

## Regla global: saneamiento de imágenes

Las cargas de imágenes siempre se sanean para evitar el rechazo del lado del proveedor debido a límites
de tamaño (reducir de tamaño/recodificar imágenes base64 excesivamente grandes).

Esto también ayuda a controlar la presión de tokens impulsada por imágenes para modelos con capacidad de visión.
Dimensiones máximas más bajas generalmente reducen el uso de tokens; dimensiones más altas preservan el detalle.

Implementación:

- `sanitizeSessionMessagesImages` en `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` en `src/agents/tool-images.ts`
- El lado máximo de la imagen es configurable a través de `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`).

---

## Regla global: llamadas a herramientas malformadas

Los bloques de llamadas a herramientas del asistente que faltan tanto `input` como `arguments` se eliminan
antes de que se construya el contexto del modelo. Esto evita rechazos del proveedor debido a llamadas a herramientas
parcialmente persistidas (por ejemplo, después de un fallo por límite de tasa).

Implementación:

- `sanitizeToolCallInputs` en `src/agents/session-transcript-repair.ts`
- Aplicado en `sanitizeSessionHistory` en `src/agents/pi-embedded-runner/google.ts`

---

## Regla global: procedencia de entrada entre sesiones

Cuando un agente envía un aviso a otra sesión a través de `sessions_send` (incluyendo
pasos de respuesta/anuncio de agente a agente), OpenClaw persiste el turno de usuario creado con:

- `message.provenance.kind = "inter_session"`

Estos metadatos se escriben en el momento de anexar a la transcripción y no cambian el rol
(`role: "user"` permanece para la compatibilidad del proveedor). Los lectores de transcripciones pueden usar
esto para evitar tratar avisos internos enrutados como instrucciones creadas por el usuario final.

Durante la reconstrucción del contexto, OpenClaw también antepone un marcador `[Inter-session message]`
corto a esos turnos de usuario en memoria para que el modelo pueda distinguirlos de las
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

- Saneamiento de id de llamada a herramienta: alfanumérico estricto.
- Reparación de emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (alternancia de turnos estilo Gemini).
- Corrección del orden de turnos de Google (anteponer un pequeño arranque de usuario si el historial comienza con el asistente).
- Antigravity Claude: normalizar firmas de pensamiento; descartar bloques de pensamiento sin firma.

**Anthropic / Minimax (compatible con Anthropic)**

- Reparación de emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (fusionar turnos de usuario consecutivos para satisfacer la alternancia estricta).

**Mistral (incluida la detección basada en ID de modelo)**

- Saneamiento del ID de la llamada a herramienta: strict9 (alfanumérico de longitud 9).

**OpenRouter Gemini**

- Limpieza de la firma de pensamiento: eliminar los valores `thought_signature` que no sean base64 (mantener base64).

**Todo lo demás**

- Solo saneamiento de imágenes.

---

## Comportamiento histórico (antes del 22.1.2026)

Antes de la versión 2026.1.22, OpenClaw aplicaba múltiples capas de higiene de transcripción:

- Una **extensión de saneamiento de transcripción** se ejecutaba en cada construcción de contexto y podía:
  - Reparar el emparejamiento de uso/resultado de herramienta.
  - Saneamiento de IDs de llamadas a herramientas (incluido un modo no estricto que conservaba `_`/`-`).
- El ejecutor también realizaba un saneamiento específico del proveedor, lo que duplicaba el trabajo.
- Ocurrieron mutaciones adicionales fuera de la política del proveedor, incluyendo:
  - Eliminar las etiquetas `<final>` del texto del asistente antes de la persistencia.
  - Descartar los turnos de error vacíos del asistente.
  - Recortar el contenido del asistente después de las llamadas a herramientas.

Esta complejidad causó regresiones entre proveedores (notablemente el emparejamiento `openai-responses`
`call_id|fc_id`). La limpieza de la versión 2026.1.22 eliminó la extensión, centralizó
la lógica en el ejecutor y convirtió a OpenAI en **sin intervención** más allá del saneamiento de imágenes.

import es from "/components/footer/es.mdx";

<es />
