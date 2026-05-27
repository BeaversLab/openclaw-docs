---
summary: "Sintaxis de directivas para /think, /fast, /verbose, /trace y visibilidad de razonamiento"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "Niveles de pensamiento"
---

## Lo que hace

- Directiva en línea en cualquier cuerpo entrante: `/t <level>`, `/think:<level>` o `/thinking <level>`.
- Niveles (alias): `off | minimal | low | medium | high | xhigh | adaptive | max`
  - mínimo → "think"
  - bajo → "think hard"
  - medio → "think harder"
  - alto → "ultrathink" (presupuesto máximo)
  - xhigh → "ultrathink+" (modelos GPT-5.2+ y Codex, además del esfuerzo Anthropic Claude Opus 4.7)
  - adaptativo → pensamiento adaptativo gestionado por el proveedor (soportado para Claude 4.6 en Anthropic/Bedrock, Anthropic Claude Opus 4.7 y pensamiento dinámico de Google Gemini)
  - max → razonamiento máximo del proveedor (Anthropic Claude Opus 4.7; Ollama asigna esto a su esfuerzo `think` nativo más alto)
  - `x-high`, `x_high`, `extra-high`, `extra high` y `extra_high` se asignan a `xhigh`.
  - `highest` se asigna a `high`.
- Notas del proveedor:
  - Los menús y selectores de pensamiento se impulsan por el perfil del proveedor. Los complementos del proveedor declaran el conjunto exacto de niveles para el modelo seleccionado, incluidas etiquetas como binario `on`.
  - `adaptive`, `xhigh` y `max` solo se anuncian para perfiles de proveedor/modelo que los admiten. Las directivas escritas para niveles no admitidos se rechazan con las opciones válidas de ese modelo.
  - Los niveles no admitidos almacenados existentes se reasignan por rango de perfil de proveedor. `adaptive` recurre a `medium` en modelos no adaptables, mientras que `xhigh` y `max` recurren al nivel no apagado admitido más grande para el modelo seleccionado.
  - Los modelos Anthropic Claude 4.6 son `adaptive` de forma predeterminada cuando no se establece ningún nivel de pensamiento explícito.
  - Anthropic Claude Opus 4.7 no tiene como valor predeterminado el pensamiento adaptativo. Su valor predeterminado de esfuerzo de la API sigue siendo propiedad del proveedor a menos que establezca explícitamente un nivel de pensamiento.
  - Anthropic Claude Opus 4.7 asigna `/think xhigh` al pensamiento adaptativo más `output_config.effort: "xhigh"`, porque `/think` es una directiva de pensamiento y `xhigh` es la configuración de esfuerzo de Opus 4.7.
  - Anthropic Claude Opus 4.7 también expone `/think max`; se asigna a la misma ruta de máximo esfuerzo propiedad del proveedor.
  - Los modelos directos DeepSeek V4 exponen `/think xhigh|max`; ambos se asignan a DeepSeek `reasoning_effort: "max"` mientras que los niveles no oficiales más bajos se asignan a `high`.
  - Los modelos DeepSeek V4 enrutados por OpenRouter exponen `/think xhigh` y envían valores `reasoning_effort` compatibles con OpenRouter. Las anulaciones `max` almacenadas vuelven a `xhigh`.
  - Los modelos Ollama con capacidad de pensamiento exponen `/think low|medium|high|max`; `max` se asigna al `think: "high"` nativo porque la API nativa de Ollama acepta cadenas de esfuerzo `low`, `medium` y `high`.
  - Los modelos OpenAI GPT asignan `/think` a través del soporte de esfuerzo de la API de Responses específico del modelo. `/think off` envía `reasoning.effort: "none"` solo cuando el modelo objetivo lo admite; de lo contrario, OpenClaw omite la carga de razonamiento deshabilitada en lugar de enviar un valor no admitido.
  - Las entradas de catálogo personalizadas compatibles con OpenAI pueden optar por `/think xhigh` estableciendo `models.providers.<provider>.models[].compat.supportedReasoningEfforts` para incluir `"xhigh"`. Esto utiliza los mismos metadatos de compatibilidad que asignan las cargas de esfuerzo de razonamiento OpenAI salientes, por lo que los menús, la validación de sesión, el CLI del agente y `llm-task` coinciden con el comportamiento del transporte.
  - Las referencias obsoletas configuradas de OpenRouter Hunter Alpha omiten la inyección de razonamiento proxy porque esa ruta retirada podría devolver el texto de respuesta final a través de campos de razonamiento.
  - Google Gemini asigna `/think adaptive` al pensamiento dinámico propio del proveedor de Gemini. Las solicitudes de Gemini 3 omiten un `thinkingLevel` fijo, mientras que las solicitudes de Gemini 2.5 envían `thinkingBudget: -1`; los niveles fijos aún se asignan al `thinkingLevel` o presupuesto de Gemini más cercano para esa familia de modelos.
  - MiniMax (`minimax/*`) en la ruta de transmisión compatible con Anthropic se establece por defecto en `thinking: { type: "disabled" }` a menos que establezcas explícitamente el pensamiento en los parámetros del modelo o de la solicitud. Esto evita deltas de `reasoning_content` filtrados del formato de transmisión Anthropic no nativo de MiniMax.
  - Z.AI (`zai/*`) solo admite pensamiento binario (`on`/`off`). Cualquier nivel que no sea `off` se trata como `on` (mapeado a `low`).
  - Moonshot (`moonshot/*`) mapea `/think off` a `thinking: { type: "disabled" }` y cualquier nivel que no sea `off` a `thinking: { type: "enabled" }`. Cuando el pensamiento está habilitado, Moonshot solo acepta `tool_choice` `auto|none`; OpenClaw normaliza los valores incompatibles a `auto`.

## Orden de resolución

1. Directiva en línea en el mensaje (se aplica solo a ese mensaje).
2. Anulación de sesión (establecida enviando un mensaje de solo directiva).
3. Valor predeterminado por agente (`agents.list[].thinkingDefault` en la configuración).
4. Valor predeterminado global (`agents.defaults.thinkingDefault` en la configuración).
5. Alternativa (fallback): valor predeterminado declarado por el proveedor cuando esté disponible; de lo contrario, los modelos con capacidad de razonamiento se resuelven en `medium` o en el nivel compatible no `off` más cercano para ese modelo, y los modelos sin capacidad de razonamiento se mantienen en `off`.

## Establecer un valor predeterminado de sesión

- Envía un mensaje que sea **solo** la directiva (se permite espacio en blanco), por ejemplo, `/think:medium` o `/t high`.
- Esto se mantiene para la sesión actual (por remitente de forma predeterminada). Usa `/think default` para borrar la anulación de sesión y heredar el valor predeterminado configurado/del proveedor; los alias incluyen `inherit`, `clear`, `reset` y `unpin`.
- `/think off` almacena una anulación explícita de apagado. Deshabilita el pensamiento hasta que cambies o borres la anulación de sesión.
- Se envía una respuesta de confirmación (`Thinking level set to high.` / `Thinking disabled.`). Si el nivel no es válido (por ejemplo, `/thinking big`), el comando se rechaza con una sugerencia y el estado de la sesión permanece sin cambios.
- Envíe `/think` (o `/think:`) sin argumentos para ver el nivel de pensamiento actual.

## Aplicación por agente

- **Pi integrado**: el nivel resuelto se pasa al tiempo de ejecución del agente Pi en proceso.
- **Backend de la CLI de Claude**: los niveles no oficiales se pasan a Claude Code como `--effort` cuando se usa `claude-cli`; consulte [CLI backends](/es/gateway/cli-backends).

## Modo rápido (/fast)

- Niveles: `on|off|default`.
- El mensaje de solo directiva alterna una anulación de modo rápido de la sesión y responde `Fast mode enabled.` / `Fast mode disabled.`. Use `/fast default` para borrar la anulación de la sesión y heredar el valor predeterminado configurado; los alias incluyen `inherit`, `clear`, `reset` y `unpin`.
- Envíe `/fast` (o `/fast status`) sin modo para ver el estado efectivo actual del modo rápido.
- OpenClaw resuelve el modo rápido en este orden:
  1. Anulación en línea/solo directiva `/fast on|off` (`/fast default` borra esta capa)
  2. Anulación de sesión
  3. Predeterminado por agente (`agents.list[].fastModeDefault`)
  4. Configuración por modelo: `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Alternativa: `off`
- Para `openai/*`, el modo rápido se asigna al procesamiento prioritario de OpenAI enviando `service_tier=priority` en las solicitudes de Responses compatibles.
- Para `openai-codex/*`, el modo rápido envía el mismo indicador `service_tier=priority` en las Responses de Codex. OpenClaw mantiene un único conmutador `/fast` compartido en ambas rutas de autenticación.
- Para las solicitudes públicas directas de `anthropic/*`, incluido el tráfico autenticado con OAuth enviado a `api.anthropic.com`, el modo rápido se asigna a los niveles de servicio de Anthropic: `/fast on` establece `service_tier=auto`, `/fast off` establece `service_tier=standard_only`.
- Para `minimax/*` en la ruta compatible con Anthropic, `/fast on` (o `params.fastMode: true`) reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.
- Los parámetros de modelo explícitos de Anthropic `serviceTier` / `service_tier` anulan el valor predeterminado del modo rápido cuando ambos están establecidos. OpenClaw aún omite la inyección del nivel de servicio de Anthropic para URL base de proxy que no sean de Anthropic.
- `/status` muestra `Fast` solo cuando el modo rápido está habilitado.

## Directivas detalladas (/verbose o /v)

- Niveles: `on` (mínimo) | `full` | `off` (predeterminado).
- Un mensaje de solo directiva alterna el modo detallado de la sesión y responde `Verbose logging enabled.` / `Verbose logging disabled.`; los niveles no válidos devuelven una sugerencia sin cambiar el estado.
- `/verbose off` almacena una anulación explícita de la sesión; borra esta a través de la Interfaz de usuario de Sesiones eligiendo `inherit`.
- La directiva en línea afecta solo ese mensaje; de lo contrario, se aplican los valores predeterminados de la sesión/globales.
- Envíe `/verbose` (o `/verbose:`) sin argumentos para ver el nivel detallado actual.
- Cuando el modo detallado está activado, los agentes que emiten resultados de herramientas estructurados (Pi, otros agentes JSON) devuelven cada llamada de herramienta como su propio mensaje de solo metadatos, con el prefijo `<emoji> <tool-name>: <arg>` cuando está disponible. Estos resúmenes de herramientas se envían tan pronto como comienza cada herramienta (burbujas separadas), no como deltas de transmisión.
- Los resúmenes de fallos de herramientas permanecen visibles en modo normal, pero los sufijos de detalles de errores sin procesar están ocultos a menos que verbose sea `full`.
- Cuando verbose es `full`, las salidas de las herramientas también se reenvían después de completarse (burbuja separada, truncada a una longitud segura). Si activa `/verbose on|full|off` mientras una ejecución está en curso, las burbujas de herramientas posteriores respetan la nueva configuración.
- `agents.defaults.toolProgressDetail` controla la forma de los resúmenes de herramientas `/verbose` y las líneas de herramientas de borrador de progreso. Use `"explain"` (predeterminado) para etiquetas humanas compactas como `🛠️ Exec: checking JS syntax`; use `"raw"` cuando también desee que se adjunte el comando/detalle sin procesar para depuración. El `agents.list[].toolProgressDetail` por agente anula el predeterminado.
  - `explain`: `🛠️ Exec: check JS syntax for /tmp/app.js`
  - `raw`: `🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## Directivas de rastreo de complementos (/trace)

- Niveles: `on` | `off` (predeterminado).
- Un mensaje con solo directiva activa la salida de traza del plugin de sesión y responde `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directiva en línea afecta solo a ese mensaje; de lo contrario, se aplican los valores predeterminados de la sesión/global.
- Envíe `/trace` (o `/trace:`) sin argumentos para ver el nivel de traza actual.
- `/trace` es más estrecho que `/verbose`: solo expone líneas de traza/depuración propiedad del plugin, como los resúmenes de depuración de Active Memory.
- Las líneas de traza pueden aparecer en `/status` y como un mensaje de diagnóstico de seguimiento después de la respuesta normal del asistente.

## Visibilidad del razonamiento (/reasoning)

- Niveles: `on|off|stream`.
- Un mensaje solo de directiva alterna si se muestran los bloques de pensamiento en las respuestas.
- Cuando está habilitado, el razonamiento se envía como un **mensaje separado** prefijado con `Thinking`.
- `stream` (solo Telegram): transmite el razonamiento a la burbuja de borrador de Telegram mientras se genera la respuesta y luego envía la respuesta final sin razonamiento.
- Alias: `/reason`.
- Envíe `/reasoning` (o `/reasoning:`) sin argumentos para ver el nivel de razonamiento actual.
- Orden de resolución: directiva en línea, luego anulación de sesión, luego predeterminado por agente (`agents.list[].reasoningDefault`), luego predeterminado global (`agents.defaults.reasoningDefault`), luego alternativa (`off`).

Las etiquetas de razonamiento de modelo local mal formadas se manejan de forma conservadora. Los bloques `<think>...</think>` cerrados permanecen ocultos en las respuestas normales, y el razonamiento no cerrado después de un texto ya visible también se oculta. Si una respuesta está completamente envuelta en una sola etiqueta de apertura no cerrada y de otro modo se entregaría como texto vacío, OpenClaw elimina la etiqueta de apertura mal formada y entrega el texto restante.

## Relacionado

- La documentación del modo elevado se encuentra en [Elevated mode](/es/tools/elevated).

## Latidos

- El cuerpo del sondeo de latido es el aviso de latido configurado (predeterminado: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Las directivas en línea en un mensaje de latido se aplican como de costumbre (pero evite cambiar los valores predeterminados de la sesión desde los latidos).
- La entrega de latidos se predetermina solo a la carga útil final. Para también enviar el mensaje `Thinking` separado (cuando esté disponible), establezca `agents.defaults.heartbeat.includeReasoning: true` o por agente `agents.list[].heartbeat.includeReasoning: true`.

## Interfaz de usuario de chat web

- El selector de pensamiento del chat web refleja el nivel almacenado de la sesión desde el almacenamiento/configuración de la sesión entrante cuando se carga la página.
- Al elegir otro nivel, se escribe la anulación de sesión inmediatamente a través de `sessions.patch`; no espera al siguiente envío y no es una anulación `thinkingOnce` de un solo uso.
- La primera opción es siempre la elección de borrar anulación. Muestra `Inherited: <resolved level>`, incluido `Inherited: Off` cuando el pensamiento heredado está deshabilitado.
- Las opciones explícitas del selector usan sus etiquetas de nivel directo mientras conservan las etiquetas del proveedor cuando están presentes (por ejemplo `Maximum` para una opción `max` etiquetada por el proveedor).
- El selector usa `thinkingLevels` devuelto por la fila/predeterminados de la sesión de la puerta de enlace, con `thinkingOptions` mantenido como una lista de etiquetas heredadas. La interfaz de usuario del navegador no mantiene su propia lista de expresiones regulares del proveedor; los complementos poseen conjuntos de niveles específicos del modelo.
- `/think:<level>` todavía funciona y actualiza el mismo nivel de sesión almacenado, por lo que las directivas de chat y el selector permanecen sincronizados.

## Perfiles de proveedores

- Los complementos del proveedor pueden exponer `resolveThinkingProfile(ctx)` para definir los niveles admitidos y el predeterminado del modelo.
- Los complementos del proveedor que actúan como proxy de modelos Claude deben reutilizar `resolveClaudeThinkingProfile(modelId)` de `openclaw/plugin-sdk/provider-model-shared` para que los catálogos directos de Anthropic y los de proxy se mantengan alineados.
- Cada nivel de perfil tiene un `id` canónico almacenado (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive` o `max`) y puede incluir un `label` de visualización. Los proveedores binarios usan `{ id: "low", label: "on" }`.
- Los complementos de herramientas que necesiten validar una anulación explícita de thinking deben usar `api.runtime.agent.resolveThinkingPolicy({ provider, model })` más `api.runtime.agent.normalizeThinkingLevel(...)`; no deben mantener sus propias listas de niveles de proveedor/modelo.
- Los complementos de herramientas con acceso a los metadatos de modelos personalizados configurados pueden pasar `catalog` a `resolveThinkingPolicy` para que las participaciones opt-in de `compat.supportedReasoningEfforts` se reflejen en la validación del lado del complemento.
- Los hooks heredados publicados (`supportsXHighThinking`, `isBinaryThinking` y `resolveDefaultThinkingLevel`) permanecen como adaptadores de compatibilidad, pero los nuevos conjuntos de niveles personalizados deben usar `resolveThinkingProfile`.
- Las filas/valores predeterminados de Gateway exponen `thinkingLevels`, `thinkingOptions` y `thinkingDefault` para que los clientes de ACP/chat representen los mismos identificadores y etiquetas de perfil que usa la validación en tiempo de ejecución.
