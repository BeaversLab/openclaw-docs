---
summary: "Referencia: reglas de saneamiento y reparación de transcripciones específicas del proveedor"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Higiene de la transcripción"
---

OpenClaw aplica **correcciones específicas del proveedor** a las transcripciones antes de una ejecución (construyendo el contexto del modelo). La mayoría de estos son **ajustes en memoria** utilizados para satisfacer los requisitos estrictos del proveedor. Una pasada de reparación separada del archivo de sesión también puede reescribir el JSONL almacenado antes de que se cargue la sesión, pero solo para líneas con formato incorrecto o turnos persistidos que sean registros duraderos no válidos. Las respuestas del asistente entregadas se conservan en el disco; la eliminación específica del proveedor del relleno previo del asistente ocurre solo al construir cargas útiles de salida. Cuando ocurre una reparación, el archivo original se escribe en un `*.bak-<pid>-<ts>` hermano transitorio antes del reemplazo atómico y se elimina una vez que el reemplazo tiene éxito; la copia de seguridad solo se retiene si la limpieza misma falla (en cuyo caso se reporta la ruta).

El alcance incluye:

- El contexto del prompt solo en tiempo de ejecución que no se incluye en los turnos de la transcripción visibles para el usuario
- Saneamiento del id de llamada de herramienta
- Validación de entrada de llamada de herramienta
- Reparación del emparejamiento de resultados de herramienta
- Validación / ordenamiento de turnos
- Limpieza de firma de pensamiento
- Limpieza de la firma de pensamiento
- Saneamiento de la carga de imagen
- Limpieza de bloques de texto en blanco antes de la reproducción del proveedor
- Etiquetado de procedencia de entrada de usuario (para avisos enrutados entre sesiones)
- Reparación de turnos de error de asistente vacíos para la reproducción de Bedrock Converse

Si necesita detalles sobre el almacenamiento de transcripciones, consulte:

- [Inmersión profunda en la gestión de sesiones](/es/reference/session-management-compaction)

---

## Regla global: el contexto de tiempo de ejecución no es la transcripción del usuario

El contexto de tiempo de ejecución/sistema se puede añadir al prompt del modelo para un turno, pero no es contenido creado por el usuario final. OpenClaw mantiene un cuerpo de prompt separado orientado a la transcripción para las respuestas de Gateway, seguimientos en cola, ACP, CLI y ejecuciones integradas de OpenClaw. Los turnos de usuario visibles almacenados utilizan ese cuerpo de transcripción en lugar del prompt enriquecido en tiempo de ejecución.

Para las sesiones heredadas que ya persistieron envoltorios de tiempo de ejecución, las superficies de historial de Gateway aplican una proyección de visualización antes de devolver mensajes a los clientes de WebChat, TUI, REST o SSE.

---

## Dónde se ejecuta esto

Toda la higiene de la transcripción está centralizada en el ejecutor integrado:

- Selección de política: `src/agents/transcript-policy.ts`
- Aplicación de saneamiento/reparación: `sanitizeSessionHistory` en `src/agents/embedded-agent-runner/replay-history.ts`

La política usa `provider`, `modelApi` y `modelId` para decidir qué aplicar.

Independientemente de la higiene de la transcripción, los archivos de sesión se reparan (si es necesario) antes de la carga:

- `repairSessionFileIfNeeded` en `src/agents/session-file-repair.ts`
- Llamado desde `run/attempt.ts` y `compact.ts` (ejecutor integrado)

---

## Regla global: saneamiento de imágenes

Las cargas útiles de imágenes siempre se sanean para evitar el rechazo del lado del proveedor debido a límites de tamaño (reducir/recomprimir imágenes base64 de tamaño excesivo).

Esto también ayuda a controlar la presión de tokens generados por imágenes para modelos con capacidad de visión.
Dimensiones máximas más bajas generalmente reducen el uso de tokens; dimensiones más altas preservan el detalle.

Implementación:

- `sanitizeSessionMessagesImages` en `src/agents/embedded-agent-helpers/images.ts`
- `sanitizeContentBlocksImages` en `src/agents/tool-images.ts`
- El lado máximo de la imagen es configurable vía `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`).
- Los bloques de texto en blanco se eliminan mientras este paso recorre el contenido de la repetición. Los turnos
  del asistente que quedan vacíos se eliminan de la copia de la repetición; los turnos de usuario y de resultados de herramientas
  que quedan vacíos reciben un marcador de posición de contenido omitido no vacío.

---

## Regla global: llamadas a herramientas con formato incorrecto

Los bloques de llamadas a herramientas del asistente que carecen tanto de `input` como de `arguments` se descartan
antes de que se construya el contexto del modelo. Esto evita rechazos del proveedor por llamadas a herramientas
parcialmente persistidas (por ejemplo, después de un fallo por límite de tasa).

Implementación:

- `sanitizeToolCallInputs` en `src/agents/session-transcript-repair.ts`
- Aplicado en `sanitizeSessionHistory` en `src/agents/embedded-agent-runner/replay-history.ts`

---

## Regla global: procedencia de entrada entre sesiones

Cuando un agente envía un mensaje a otra sesión vía `sessions_send` (incluyendo
pasos de respuesta/anuncio de agente a agente), OpenClaw persiste el turno de usuario creado con:

- `message.provenance.kind = "inter_session"`

OpenClaw también antepone un marcador `[Inter-session message ... isUser=false]` del mismo turno antes del texto del mensaje enrutado para que la llamada del modelo activo pueda distinguir el resultado de una sesión externa de las instrucciones del usuario final externo. Este marcador incluye la sesión de origen, el canal y la herramienta, cuando están disponibles. La transcripción sigue utilizando `role: "user"` para la compatibilidad con el proveedor, pero tanto el texto visible como los metadatos de procedencia marcan el turno como datos entre sesiones.

Durante la reconstrucción del contexto, OpenClaw aplica el mismo marcador a los turnos de usuario entre sesiones
antiguos persistidos que solo tienen metadatos de procedencia.

---

## Matriz de proveedores (comportamiento actual)

**OpenAI / OpenAI Codex**

- Solo saneamiento de imágenes.
- Descartar firmas de razonamiento huérfanas (elementos de razonamiento independientes sin un bloque de contenido siguiente) para las transcripciones de OpenAI Responses/Codex, y descartar el razonamiento reproducible de OpenAI después de un cambio de ruta del modelo.
- Conservar las cargas útiles de elementos de razonamiento de OpenAI Responses reproducibles, incluidos los elementos de resumen vacío cifrados, para que la reproducción manual/WebSocket mantenga el estado `rs_*` requerido emparejado con los elementos de salida del asistente.
- Las respuestas nativas de ChatGPT Codex siguen la paridad de cable de Codex al reproducir cargas útiles previas de razonamiento/mensaje/función de Responses sin ID de elementos previos, preservando al mismo tiempo `prompt_cache_key` de la sesión.
- La reproducción de la familia Responses de OpenAI conserva los pares de razonamiento del mismo modelo canónicos `call_*|fc_*`, pero normaliza de manera determinista los ids de elementos de llamadas a funciones/sobrealargados o malformados `call_id` antes de la conversión de carga útil pi-ai.
- La reparación del emparejamiento de resultados de herramientas puede mover las salidas coincidentes reales y sintetizar salidas estilo Codex `aborted` para llamadas a herramientas faltantes.
- Sin validación o reordenamiento de turnos.
- Las salidas de herramientas faltantes de la familia Responses de OpenAI se sintetizan como `aborted` para coincidir con la normalización de reproducción de Codex.
- Sin eliminación de firmas de pensamiento.

**Completaciones de Chat compatibles con OpenAI**

- Los bloques de pensamiento/razonamiento históricos del asistente se eliminan antes de la reproducción para que los servidores compatibles con OpenAI locales y de estilo proxy no reciban campos de razonamiento de turnos anteriores como `reasoning` o `reasoning_content`.
- Las continuaciones de llamadas a herramientas del mismo turno mantienen el bloque de razonamiento del asistente adjunto a la llamada a herramienta hasta que se haya reproducido el resultado de la herramienta.
- Las excepciones propiedad del proveedor pueden optar por no participar cuando su protocolo de cable requiera
  metadatos de razonamiento reproducidos.

**Google (Generative AI / Gemini CLI / Antigravity)**

- Saneamiento del ID de llamada a herramienta: solo alfanumérico estricto.
- Reparación del emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (alternancia de turnos estilo Gemini).
- Corrección del orden de turnos de Google (antepone un pequeño arranque de usuario si el historial comienza con el asistente).
- Antigravity Claude: normalizar firmas de pensamiento; descartar bloques de pensamiento sin firmar.

**Anthropic / Minimax (compatible con Anthropic)**

- Reparación del emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (fusionar turnos consecutivos del usuario para satisfacer una alternancia estricta).
- Los turnos de relleno previo del asistente finales se eliminan de las cargas útiles
  salientes de Anthropic Messages cuando el pensamiento está habilitado, incluyendo las rutas de Cloudflare AI Gateway.
- Los bloques de pensamiento con firmas de repetición faltantes, vacías o en blanco se eliminan
  antes de la conversión del proveedor. Si eso vacía un turno del asistente, OpenClaw mantiene
  la forma del turno con texto de razonamiento omitido no vacío.
- Los turnos de asistente más antiguos solo de pensamiento que deben eliminarse se reemplazan con
  texto de razonamiento omitido no vacío para que los adaptadores del proveedor no eliminen el turno
  de repetición.

**Amazon Bedrock (API de conversación)**

- Los turnos de error de flujo del asistente vacíos se reparan a un bloque de texto de reserva no vacío antes de la reproducción. Bedrock Converse rechaza los mensajes del asistente con `content: []`, por lo que los turnos del asistente persistidos con `stopReason: "error"` y contenido vacío también se reparan en el disco antes de la carga.
- Los turnos de asistente con errores de transmisión que contienen solo bloques de texto en blanco se eliminan
  de la copia de repetición en memoria en lugar de repetir un bloque en blanco no válido.
- Los bloques de pensamiento de Claude con firmas de repetición faltantes, vacías o en blanco se
  eliminan antes de la repetición de Converse. Si eso vacía un turno de asistente, OpenClaw
  mantiene la forma del turno con texto de razonamiento omitido no vacío.
- Los turnos de asistente de solo pensamiento antiguos que deben eliminarse se reemplazan por
  texto de razonamiento omitido no vacío para que la repetición de Converse mantenga una forma de turno estricta.
- La repetición filtra los turnos de asistente inyectados por el espejo de entrega de OpenClaw y la puerta de enlace.
- La sanitización de imágenes se aplica a través de la regla global.

**Mistral (incluida la detección basada en el ID del modelo)**

- Sanitización del ID de la llamada a herramienta: strict9 (alfanumérico de longitud 9).

**OpenRouter Gemini**

- Limpieza de firma de pensamiento: eliminar valores `thought_signature` que no sean base64 (mantener base64).

**OpenRouter Anthropic**

- Los turnos de relleno previo del asistente finales se eliminan de las cargas útiles del modelo Anthropic compatible con OpenAI de OpenRouter verificadas cuando el razonamiento está activado, coincidiendo con el comportamiento de repetición directo de Anthropic y Anthropic en Cloudflare.

**Todo lo demás**

- Solo sanitización de imágenes.

---

## Comportamiento histórico (antes del 22/01/2026)

Antes del lanzamiento de 2026.1.22, OpenClaw aplicaba múltiples capas de higiene de transcripciones:

- Una **extensión de sanitización de transcripciones** se ejecutaba en cada construcción de contexto y podía:
  - Reparar el emparejamiento de uso/resultado de herramientas.
  - Saneamiento de ids de llamadas a herramientas (incluido un modo no estricto que preservaba `_`/`-`).
- El ejecutor también realizaba una sanitización específica del proveedor, lo que duplicaba el trabajo.
- Ocurrieron mutaciones adicionales fuera de la política del proveedor, incluyendo:
  - Eliminación de etiquetas `<final>` del texto del asistente antes de la persistencia.
  - Eliminar turnos de error de asistente vacíos.
  - Recortar el contenido del asistente después de las llamadas a herramientas.

Esta complejidad provocó regresiones entre proveedores (notablemente el emparejamiento `openai-responses`
`call_id|fc_id`). La limpieza del 22 de enero de 2026 eliminó la extensión, centralizó
la lógica en el ejecutor e hizo que OpenAI fuera de **no tocar** más allá de la sanitización de imágenes.

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Poda de sesiones](/es/concepts/session-pruning)
