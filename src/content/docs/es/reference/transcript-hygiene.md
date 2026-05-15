---
summary: "Referencia: reglas de saneamiento y reparación de transcripciones específicas del proveedor"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Higiene de la transcripción"
---

OpenClaw aplica **correcciones específicas del proveedor** a las transcripciones antes de una ejecución (construyendo el contexto del modelo). La mayoría de estos son ajustes **en memoria** utilizados para satisfacer los requisitos estrictos del proveedor. Un paso de reparación del archivo de sesión separado también puede reescribir el JSONL almacenado antes de que se cargue la sesión, pero solo para líneas con formato incorrecto o turnos persistidos que son registros duraderos no válidos. Las respuestas del asistente entregadas se conservan en el disco; la eliminación específica del proveedor del relleno previo del asistente ocurre solo al construir cargas útiles de salida. Cuando ocurre una reparación, el archivo original se respalda junto al archivo de sesión.

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

- [Análisis profundo de la gestión de sesiones](/es/reference/session-management-compaction)

---

## Regla global: el contexto de tiempo de ejecución no es la transcripción del usuario

El contexto de tiempo de ejecución/sistema se puede agregar al aviso del modelo para un turno, pero no es contenido creado por el usuario final. OpenClaw mantiene un cuerpo de aviso orientado a la transcripción separado para las respuestas de Gateway, seguimientos en cola, ACP, CLI y ejecuciones de Pi integradas. Los turnos de usuario visibles almacenados usan ese cuerpo de transcripción en lugar del aviso enriquecido en tiempo de ejecución.

Para las sesiones heredadas que ya persistieron envoltorios de tiempo de ejecución, las superficies de historial de Gateway aplican una proyección de visualización antes de devolver mensajes a los clientes de WebChat, TUI, REST o SSE.

---

## Dónde se ejecuta esto

Toda la higiene de la transcripción está centralizada en el ejecutor integrado:

- Selección de política: `src/agents/transcript-policy.ts`
- Aplicación de saneamiento/reparación: `sanitizeSessionHistory` en `src/agents/pi-embedded-runner/replay-history.ts`

La política utiliza `provider`, `modelApi` y `modelId` para decidir qué aplicar.

Independientemente de la higiene de la transcripción, los archivos de sesión se reparan (si es necesario) antes de la carga:

- `repairSessionFileIfNeeded` en `src/agents/session-file-repair.ts`
- Llamado desde `run/attempt.ts` y `compact.ts` (ejecutor integrado)

---

## Regla global: saneamiento de imágenes

Las cargas útiles de imágenes siempre se sanean para evitar el rechazo del lado del proveedor debido a límites de tamaño (reducir/recomprimir imágenes base64 de tamaño excesivo).

Esto también ayuda a controlar la presión de tokens generados por imágenes para modelos con capacidad de visión.
Dimensiones máximas más bajas generalmente reducen el uso de tokens; dimensiones más altas preservan el detalle.

Implementación:

- `sanitizeSessionMessagesImages` en `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` en `src/agents/tool-images.ts`
- El lado máximo de la imagen es configurable mediante `agents.defaults.imageMaxDimensionPx` (predeterminado: `1200`).
- Los bloques de texto en blanco se eliminan mientras este paso recorre el contenido de la repetición. Los turnos
  del asistente que quedan vacíos se eliminan de la copia de la repetición; los turnos de usuario y de resultados de herramientas
  que quedan vacíos reciben un marcador de posición de contenido omitido no vacío.

---

## Regla global: llamadas a herramientas con formato incorrecto

Los bloques de llamadas a herramientas del asistente que carecen tanto de `input` como de `arguments` se eliminan
antes de que se construya el contexto del modelo. Esto evita los rechazos del proveedor debido a llamadas a herramientas
parcialmente persistidas (por ejemplo, después de un fallo por límite de velocidad).

Implementación:

- `sanitizeToolCallInputs` en `src/agents/session-transcript-repair.ts`
- Aplicado en `sanitizeSessionHistory` en `src/agents/pi-embedded-runner/replay-history.ts`

---

## Regla global: procedencia de entrada entre sesiones

Cuando un agente envía un mensaje a otra sesión a través de `sessions_send` (incluyendo
pasos de respuesta/anuncio de agente a agente), OpenClaw persiste el turno de usuario creado con:

- `message.provenance.kind = "inter_session"`

OpenClaw también antepone un marcador `[Inter-session message ... isUser=false]` del mismo turno
antes del texto del mensaje enrutado para que la llamada al modelo activa pueda distinguir
la salida de una sesión externa de las instrucciones del usuario final externo. Este marcador incluye
la sesión de origen, el canal y la herramienta cuando están disponibles. La transcripción todavía usa
`role: "user"` para la compatibilidad del proveedor, pero tanto el texto visible como los metadatos de procedencia
marcan el turno como datos entre sesiones.

Durante la reconstrucción del contexto, OpenClaw aplica el mismo marcador a los turnos de usuario entre sesiones
antiguos persistidos que solo tienen metadatos de procedencia.

---

## Matriz de proveedores (comportamiento actual)

**OpenAI / OpenAI Codex**

- Solo saneamiento de imágenes.
- Descartar firmas de razonamiento huérfanas (elementos de razonamiento independientes sin un bloque de contenido siguiente) para las transcripciones de OpenAI Responses/Codex, y descartar el razonamiento reproducible de OpenAI después de un cambio de ruta del modelo.
- Conservar las cargas útiles de los elementos de razonamiento de OpenAI Responses reproducibles, incluidos los elementos de resumen vacío cifrados, para que la reproducción manual/WebSocket mantenga el estado `rs_*` requerido emparejado con los elementos de salida del asistente.
- Native ChatGPT Codex Responses sigue la paridad del protocolo de Codex reproduciendo las cargas útiles de razonamiento/mensaje/función de Responses anteriores sin IDs de elemento anteriores, mientras conserva el `prompt_cache_key` de la sesión.
- Sin saneamiento del ID de la llamada a herramienta.
- La reparación del emparejamiento de resultados de herramientas puede mover las salidas coincidentes reales y sintetizar salidas `aborted` estilo Codex para las llamadas a herramientas faltantes.
- Sin validación o reordenamiento de turnos.
- Las salidas de herramientas de la familia OpenAI Responses faltantes se sintetizan como `aborted` para coincidir con la normalización de reproducción de Codex.
- Sin eliminación de firmas de pensamiento.

**Gemma 4 compatible con OpenAI**

- Los bloques históricos de pensamiento/razonamiento del asistente se eliminan antes de la reproducción para que los servidores locales Gemma 4 compatibles con OpenAI no reciban contenido de razonamiento de turnos anteriores.
- Las continuaciones de llamadas a herramientas del mismo turno mantienen el bloque de razonamiento del asistente adjunto a la llamada a herramienta hasta que se haya reproducido el resultado de la herramienta.

**Google (Generative AI / Gemini CLI / Antigravity)**

- Saneamiento del ID de la llamada a herramienta: solo alfanumérico estricto.
- Reparación del emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (alternancia de turnos estilo Gemini).
- Corrección del orden de turnos de Google (anteponer un pequeño arranque de usuario si el historial comienza con el asistente).
- Antigravity Claude: normalizar las firmas de pensamiento; descartar bloques de pensamiento sin firmar.

**Anthropic / Minimax (compatible con Anthropic)**

- Reparación del emparejamiento de resultados de herramientas y resultados de herramientas sintéticos.
- Validación de turnos (fusionar turnos de usuario consecutivos para satisfacer la alternancia estricta).
- Los turnos de relleno previo del asistente finales se eliminan de las cargas útiles de Anthropic Messages salientes cuando el pensamiento está habilitado, incluidas las rutas de Cloudflare AI Gateway.
- Los bloques de pensamiento con firmas de reproducción faltantes, vacías o en blanco se eliminan antes de la conversión del proveedor. Si eso vacía un turno del asistente, OpenClaw mantiene la forma del turno con texto de razonamiento omitido no vacío.
- Los turnos anteriores del asistente que contienen solo pensamiento y que deben eliminarse se reemplazan con texto de razonamiento omitido no vacío para que los adaptadores del proveedor no eliminen el turno de reproducción.

**Amazon Bedrock (API Converse)**

- Los turnos de asistente vacíos con errores de flujo se reparan con un bloque de texto de reserva no vacío antes de la repetición. Bedrock Converse rechaza los mensajes del asistente con `content: []`, por lo que los turnos del asistente persistidos con `stopReason: "error"` y contenido vacío también se reparan en el disco antes de la carga.
- Los turnos de asistente con errores de flujo que contienen solo bloques de texto en blanco se eliminan de la copia de repetición en memoria en lugar de repetir un bloque en blanco no válido.
- Los bloques de pensamiento de Claude con firmas de repetición faltantes, vacías o en blanco se eliminan antes de la repetición de Converse. Si eso vacía un turno del asistente, OpenClaw mantiene la forma del turno con texto de razonamiento omitido no vacío.
- Los turnos de asistente antiguos que solo contenían pensamiento y que deben eliminarse se reemplazan con texto de razonamiento omitido no vacío para que la repetición de Converse mantenga una forma estricta de los turnos.
- La repetición filtra los turnos del asistente inyectados por el espejo de entrega de OpenClaw y la puerta de enlace.
- La saneamiento de imágenes se aplica a través de la regla global.

**Mistral (incluida la detección basada en el ID del modelo)**

- Saneamiento del ID de llamada a herramienta: strict9 (alfanumérico de longitud 9).

**OpenRouter Gemini**

- Limpieza de firmas de pensamiento: eliminar valores `thought_signature` que no sean base64 (mantener base64).

**OpenRouter Anthropic**

- Los turnos de relleno previo del asistente finales se eliminan de las cargas útiles del modelo Anthropic compatible con OpenAI de OpenRouter verificadas cuando el razonamiento está habilitado, coincidiendo con el comportamiento de repetición directa de Anthropic y Cloudflare Anthropic.

**Todo lo demás**

- Solo saneamiento de imágenes.

---

## Comportamiento histórico (antes del 22/01/2026)

Antes del lanzamiento de la versión 2026.1.22, OpenClaw aplicaba múltiples capas de higiene de transcripciones:

- Una **extensión de saneamiento de transcripciones** se ejecutaba en cada construcción de contexto y podía:
  - Reparar el emparejamiento de uso/resultado de herramientas.
  - Saneamiento de los IDs de llamadas a herramientas (incluido un modo no estricto que preservaba `_`/`-`).
- El ejecutor también realizaba un saneamiento específico del proveedor, lo cual duplicaba el trabajo.
- Ocurrieron mutaciones adicionales fuera de la política del proveedor, incluyendo:
  - Eliminar las etiquetas `<final>` del texto del asistente antes de la persistencia.
  - Eliminar turnos de error de asistente vacíos.
  - Recortar el contenido del asistente después de las llamadas a herramientas.

Esta complejidad provocó regresiones entre proveedores (notablemente el emparejamiento `openai-responses` `call_id|fc_id`). La limpieza del 22 de enero de 2026 eliminó la extensión, centralizó la lógica en el ejecutor y convirtió a OpenAI en **no-touch** más allá de la sanitización de imágenes.

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Poda de sesiones](/es/concepts/session-pruning)
