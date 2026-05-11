---
summary: "Referencia: reglas de saneamiento y reparación de transcripciones específicas del proveedor"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Higiene de la transcripción"
---

OpenClaw aplica **correcciones específicas del proveedor** a las transcripciones antes de una ejecución (construcción del contexto del modelo). La mayoría de estos son **ajustes en memoria** que se utilizan para satisfacer los requisitos estrictos del proveedor. Un pase de reparación de archivos de sesión separado también puede reescribir el JSONL almacenado antes de que se cargue la sesión, ya sea eliminando líneas JSONL malformadas o reparando turnos persistidos que son sintácticamente válidos pero que se sabe que son rechazados por un
proveedor durante la repetición. Cuando ocurre una reparación, el archivo original se respalda junto
con el archivo de sesión.

El alcance incluye:

- El contexto del prompt solo en tiempo de ejecución que no se incluye en los turnos de la transcripción visibles para el usuario
- Saneamiento del id de llamada de herramienta
- Validación de entrada de llamada de herramienta
- Reparación del emparejamiento de resultados de herramienta
- Validación / ordenamiento de turnos
- Limpieza de firma de pensamiento
- Limpieza de la firma de pensamiento
- Saneamiento de la carga de imagen
- Etiquetado de procedencia de entrada del usuario (para prompts enrutados entre sesiones)
- Reparación de turnos de error del asistente vacíos para la repetición de Bedrock Converse

Si necesita detalles sobre el almacenamiento de transcripciones, consulte:

- [Profundización en la gestión de sesiones](/es/reference/session-management-compaction)

---

## Regla global: el contexto en tiempo de ejecución no es la transcripción del usuario

El contexto del sistema/tiempo de ejecución se puede agregar al prompt del modelo para un turno, pero no
es contenido creado por el usuario final. OpenClaw mantiene un cuerpo de prompt
separado para la transcripción para las respuestas de Gateway, seguimientos en cola, ACP, CLI y ejecuciones
de Pi integradas. Los turnos de usuario visibles almacenados utilizan ese cuerpo de transcripción en lugar del
prompt enriquecido en tiempo de ejecución.

Para las sesiones heredadas que ya persistieron los envoltorios en tiempo de ejecución, las superficies de
historial de Gateway aplican una proyección de visualización antes de devolver mensajes a los clientes de WebChat,
TUI, REST o SSE.

---

## Dónde se ejecuta esto

Toda la higiene de la transcripción está centralizada en el ejecutor integrado:

- Selección de políticas: `src/agents/transcript-policy.ts`
- Aplicación de saneamiento/reparación: `sanitizeSessionHistory` en `src/agents/pi-embedded-runner/replay-history.ts`

La política utiliza `provider`, `modelApi` y `modelId` para decidir qué aplicar.

Separado de la higiene de la transcripción, los archivos de sesión se reparan (si es necesario) antes de cargar:

- `repairSessionFileIfNeeded` en `src/agents/session-file-repair.ts`
- Llamado desde `run/attempt.ts` y `compact.ts` (ejecutor integrado)

---

## Regla global: saneamiento de imágenes

Las cargas útiles de imagen siempre se sanitizan para evitar el rechazo del proveedor debido a límites
de tamaño (reducir/recodificar imágenes base64 excesivamente grandes).

Esto también ayuda a controlar la presión de tokens impulsada por imágenes en modelos con capacidad de visión.
Las dimensiones máximas más bajas generalmente reducen el uso de tokens; las dimensiones más altas preservan los detalles.

Implementación:

- `sanitizeSessionMessagesImages` en `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` en `src/agents/tool-images.ts`
- El lado máximo de la imagen es configurable a través de `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`).

---

## Regla global: llamadas a herramientas malformadas

Los bloques de llamadas a herramientas del asistente que faltan tanto `input` como `arguments` se eliminan
antes de que se construya el contexto del modelo. Esto evita rechazos del proveedor por llamadas a herramientas
persistidas parcialmente (por ejemplo, después de un fallo de límite de velocidad).

Implementación:

- `sanitizeToolCallInputs` en `src/agents/session-transcript-repair.ts`
- Aplicado en `sanitizeSessionHistory` en `src/agents/pi-embedded-runner/replay-history.ts`

---

## Regla global: procedencia de entrada entre sesiones

Cuando un agente envía un mensaje a otra sesión a través de `sessions_send` (incluyendo
pasos de respuesta/anuncio de agente a agente), OpenClaw persiste el turno de usuario creado con:

- `message.provenance.kind = "inter_session"`

Estos metadatos se escriben en el momento de agregar a la transcripción y no cambian el rol
(`role: "user"` permanece para la compatibilidad del proveedor). Los lectores de transcripciones pueden usar
esto para evitar tratar los mensajes internos enrutados como instrucciones creadas por el usuario final.

Durante la reconstrucción del contexto, OpenClaw también antepone un marcador `[Inter-session message]`
corto a esos turnos de usuario en memoria para que el modelo pueda distinguirlos de
las instrucciones de usuarios finales externos.

---

## Matriz de proveedores (comportamiento actual)

**OpenAI / OpenAI Codex**

- Solo sanitización de imágenes.
- Eliminar firmas de razonamiento huérfanas (elementos de razonamiento independientes sin un bloque de contenido siguiente) para las transcripciones de OpenAI Responses/Codex, y eliminar el razonamiento reproducible de OpenAI después de un cambio de ruta de modelo.
- Sin sanitización de id de llamada a herramienta.
- La reparación del emparejamiento de resultados de herramientas puede mover las salidas coincidentes reales y sintetizar salidas `aborted` estilo Codex para llamadas a herramientas faltantes.
- Sin validación ni reordenamiento de turnos.
- Las salidas de herramientas de la familia de respuestas de OpenAI faltantes se sintetizan como `aborted` para que coincidan con la normalización de reproducción de Codex.
- Sin eliminación de firmas de pensamiento.

**Gemma 4 compatible con OpenAI**

- Los bloques de pensamiento/razonamiento históricos del asistente se eliminan antes de la reproducción para que los servidores locales
  Gemma 4 compatibles con OpenAI no reciban contenido de razonamiento de turnos anteriores.
- Las continuaciones de llamadas a herramientas del mismo turno mantienen el bloque de razonamiento del asistente
  adjunto a la llamada a la herramienta hasta que se haya reproducido el resultado de la herramienta.

**Google (Generative AI / Gemini CLI / Antigravity)**

- Saneamiento del id de llamada a herramienta: solo alfanumérico estricto.
- Reparación del emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (alternancia de turnos estilo Gemini).
- Corrección del orden de los turnos de Google (anteponer un pequeño arranque de usuario si el historial comienza con el asistente).
- Antigravity Claude: normalizar firmas de pensamiento; eliminar bloques de pensamiento sin firmar.

**Anthropic / Minimax (compatible con Anthropic)**

- Reparación del emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (fusionar turnos de usuario consecutivos para satisfacer la alternancia estricta).
- Los bloques de pensamiento con firmas de reproducción faltantes, vacías o en blanco se eliminan
  antes de la conversión del proveedor. Si eso vacía un turno de asistente, OpenClaw mantiene
  la forma del turno con texto de razonamiento omitido no vacío.
- Los turnos de asistente antiguos que contenían solo pensamiento y que deben eliminarse se reemplazan por
  texto de razonamiento omitido no vacío para que los adaptadores del proveedor no eliminen el turno de
  reproducción.

**Amazon Bedrock (API de Converse)**

- Los turnos de asistente de error de flujo vacíos se reparan con un bloque de texto de reserva no vacío
  antes de la reproducción. Bedrock Converse rechaza los mensajes de asistente con `content: []`, por lo que
  los turnos de asistente persistentes con `stopReason: "error"` y contenido vacío también
  se reparan en el disco antes de la carga.
- Los bloques de pensamiento de Claude con firmas de reproducción faltantes, vacías o en blanco se
  eliminan antes de la reproducción de Converse. Si eso vacía un turno de asistente, OpenClaw
  mantiene la forma del turno con texto de razonamiento omitido no vacío.
- Los turnos de asistente antiguos que contenían solo pensamiento y que deben eliminarse se reemplazan por
  texto de razonamiento omitido no vacío para que la reproducción de Converse mantenga una forma de turno estricta.
- La reproducción filtra los turnos de asistente inyectados por el espejo de entrega y la puerta de enlace de OpenClaw.
- La sanitización de imágenes se aplica a través de la regla global.

**Mistral (incluida la detección basada en el id del modelo)**

- Sanitización del id de llamada de herramienta: strict9 (alfanumérico de longitud 9).

**OpenRouter Gemini**

- Limpieza de firmas de pensamiento: eliminar valores `thought_signature` que no sean base64 (conservar base64).

**Todo lo demás**

- Solo sanitización de imágenes.

---

## Comportamiento histórico (antes del 22.1.2026)

Antes del lanzamiento 2026.1.22, OpenClaw aplicaba múltiples capas de higiene de transcripción:

- Una **extensión de sanitización de transcripción** se ejecutaba en cada construcción de contexto y podía:
  - Reparar el emparejamiento de uso/resultado de herramientas.
  - Sanitizar los ids de llamadas de herramientas (incluido un modo no estricto que preservaba `_`/`-`).
- El ejecutor también realizaba una sanitización específica del proveedor, lo cual duplicaba el trabajo.
- Ocurrieron mutaciones adicionales fuera de la política del proveedor, incluyendo:
  - Eliminar etiquetas `<final>` del texto del asistente antes de la persistencia.
  - Descartar turnos de error del asistente vacíos.
  - Recortar el contenido del asistente después de las llamadas a herramientas.

Esta complejidad causó regresiones entre proveedores (notablemente el emparejamiento `openai-responses`
`call_id|fc_id`). La limpieza de la versión 2026.1.22 eliminó la extensión, centralizó
la lógica en el ejecutor e hizo que OpenAI fuera **sin tocar** más allá de la sanitización de imágenes.

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Poda de sesiones](/es/concepts/session-pruning)
