---
summary: "Sintaxis de directivas para /think, /fast, /verbose, /trace y visibilidad de razonamiento"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "Niveles de pensamiento"
---

# Niveles de pensamiento (directivas /think)

## Qué hace

- Directiva en línea en cualquier cuerpo entrante: `/t <level>`, `/think:<level>` o `/thinking <level>`.
- Niveles (alias): `off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink” (presupuesto máximo)
  - xhigh → “ultrathink+” (modelos GPT-5.2 + Codex y esfuerzo de Anthropic Claude Opus 4.7)
  - adaptive → pensamiento adaptativo gestionado por el proveedor (compatible con Claude 4.6 en Anthropic/Bedrock y Anthropic Claude Opus 4.7)
  - max → razonamiento máximo del proveedor (actualmente Anthropic Claude Opus 4.7)
  - `x-high`, `x_high`, `extra-high`, `extra high` y `extra_high` se asignan a `xhigh`.
  - `highest` se asigna a `high`.
- Notas del proveedor:
  - Los menús y selectores de pensamiento están impulsados por el perfil del proveedor. Los complementos del proveedor declaran el conjunto exacto de niveles para el modelo seleccionado, incluyendo etiquetas como binario `on`.
  - `adaptive`, `xhigh` y `max` solo se anuncian para los perfiles de proveedor/modelo que los soportan. Las directivas escritas para niveles no soportados se rechazan con las opciones válidas de ese modelo.
  - Los niveles no soportados almacenados se reasignan por el rango del perfil del proveedor. `adaptive` vuelve a `medium` en modelos no adaptables, mientras que `xhigh` y `max` vuelven al mayor nivel soportado que no sea "apagado" para el modelo seleccionado.
  - Los modelos Anthropic Claude 4.6 tienen como valor predeterminado `adaptive` cuando no se establece ningún nivel de pensamiento explícito.
  - Anthropic Claude Opus 4.7 no tiene como valor predeterminado el pensamiento adaptable. Su valor predeterminado de esfuerzo de API sigue siendo propiedad del proveedor a menos que establezca explícitamente un nivel de pensamiento.
  - Anthropic Claude Opus 4.7 asigna `/think xhigh` a pensamiento adaptable más `output_config.effort: "xhigh"`, porque `/think` es una directiva de pensamiento y `xhigh` es la configuración de esfuerzo de Opus 4.7.
  - Anthropic Claude Opus 4.7 también expone `/think max`; se asigna a la misma ruta de esfuerzo máximo propiedad del proveedor.
  - Los modelos OpenAI GPT asignan `/think` a través del soporte de esfuerzo de la API de Responses específico del modelo. `/think off` envía `reasoning.effort: "none"` solo cuando el modelo de destino lo soporta; de lo contrario, OpenClaw omite la carga de razonamiento desactivada en lugar de enviar un valor no soportado.
  - MiniMax (`minimax/*`) en la ruta de transmisión compatible con Anthropic tiene como valor predeterminado `thinking: { type: "disabled" }` a menos que establezca explícitamente el pensamiento en los parámetros del modelo o de la solicitud. Esto evita deltas `reasoning_content` filtrados del formato de transmisión de Anthropic no nativo de MiniMax.
  - Z.AI (`zai/*`) solo admite pensamiento binario (`on`/`off`). Cualquier nivel que no sea `off` se trata como `on` (mapeado a `low`).
  - Moonshot (`moonshot/*`) asigna `/think off` a `thinking: { type: "disabled" }` y cualquier nivel que no sea `off` a `thinking: { type: "enabled" }`. Cuando el pensamiento está activado, Moonshot solo acepta `tool_choice` `auto|none`; OpenClaw normaliza los valores incompatibles a `auto`.

## Orden de resolución

1. Directiva en línea en el mensaje (se aplica solo a ese mensaje).
2. Anulación de sesión (establecida enviando un mensaje que solo contiene la directiva).
3. Predeterminado por agente (`agents.list[].thinkingDefault` en la configuración).
4. Predeterminado global (`agents.defaults.thinkingDefault` en la configuración).
5. Respaldo: predeterminado declarado por el proveedor cuando está disponible, `low` para otros modelos del catálogo marcados como capaces de razonamiento, `off` en caso contrario.

## Establecer un valor predeterminado de sesión

- Envíe un mensaje que sea **solo** la directiva (se permite el espacio en blanco), p. ej. `/think:medium` o `/t high`.
- Esto se mantiene para la sesión actual (por remitente de forma predeterminada); se borra con `/think:off` o al restablecer por inactividad de la sesión.
- Se envía una respuesta de confirmación (`Thinking level set to high.` / `Thinking disabled.`). Si el nivel no es válido (p. ej. `/thinking big`), el comando se rechaza con una sugerencia y el estado de la sesión permanece sin cambios.
- Envíe `/think` (o `/think:`) sin argumentos para ver el nivel de pensamiento actual.

## Aplicación por agente

- **Pi integrado**: el nivel resuelto se pasa al tiempo de ejecución del agente Pi en proceso.

## Modo rápido (/fast)

- Niveles: `on|off`.
- El mensaje con solo la directiva alterna una anulación del modo rápido de sesión y responde `Fast mode enabled.` / `Fast mode disabled.`.
- Envíe `/fast` (o `/fast status`) sin modo para ver el estado efectivo actual del modo rápido.
- OpenClaw resuelve el modo rápido en este orden:
  1. Solo en línea/directiva `/fast on|off`
  2. Anulación de sesión
  3. Predeterminado por agente (`agents.list[].fastModeDefault`)
  4. Configuración por modelo: `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Alternativa: `off`
- Para `openai/*`, el modo rápido se asigna al procesamiento prioritario de OpenAI enviando `service_tier=priority` en las solicitudes de Responses compatibles.
- Para `openai-codex/*`, el modo rápido envía el mismo indicador `service_tier=priority` en las Responses de Codex. OpenClaw mantiene un único interruptor compartido `/fast` en ambas rutas de autenticación.
- Para solicitudes directas públicas `anthropic/*`, incluido el tráfico autenticado con OAuth enviado a `api.anthropic.com`, el modo rápido se asigna a los niveles de servicio de Anthropic: `/fast on` establece `service_tier=auto`, `/fast off` establece `service_tier=standard_only`.
- Para `minimax/*` en la ruta compatible con Anthropic, `/fast on` (o `params.fastMode: true`) reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.
- Los parámetros de modelo explícitos de Anthropic `serviceTier` / `service_tier` anulan el predeterminado del modo rápido cuando ambos están establecidos. OpenClaw aún omite la inyección de nivel de servicio de Anthropic para URL base de proxy no Anthropic.
- `/status` muestra `Fast` solo cuando el modo rápido está habilitado.

## Directivas detalladas (/verbose o /v)

- Niveles: `on` (mínimo) | `full` | `off` (predeterminado).
- El mensaje de solo directiva activa el modo detallado de la sesión y responde `Verbose logging enabled.` / `Verbose logging disabled.`; los niveles no válidos devuelven una sugerencia sin cambiar el estado.
- `/verbose off` almacena una anulación explícita de sesión; bórrela a través de la interfaz de usuario de Sesiones eligiendo `inherit`.
- La directiva en línea solo afecta ese mensaje; de lo contrario, se aplican los valores predeterminados de sesión/global.
- Envíe `/verbose` (o `/verbose:`) sin argumento para ver el nivel detallado actual.
- Cuando el modo detallado (verbose) está activado, los agentes que emiten resultados de herramientas estructurados (Pi, otros agentes JSON) envían cada llamada de herramienta de vuelta como su propio mensaje solo de metadatos, prefijado con `<emoji> <tool-name>: <arg>` cuando está disponible (ruta/comando). Estos resúmenes de herramientas se envían tan pronto como cada herramienta se inicia (burbujas separadas), no como deltas de transmisión continua.
- Los resúmenes de fallos de herramientas permanecen visibles en modo normal, pero los sufijos de detalles de errores brutos están ocultos a menos que verbose sea `on` o `full`.
- Cuando verbose es `full`, las salidas de las herramientas también se reenvían después de completarse (burbuja separada, truncada a una longitud segura). Si alternas `/verbose on|full|off` mientras una ejecución está en curso, las burbujas de herramientas posteriores respetan la nueva configuración.

## Directivas de traza de complementos (/trace)

- Niveles: `on` | `off` (predeterminado).
- El mensaje de solo directiva alterna la salida de traza de complementos de la sesión y responde `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directiva en línea afecta solo ese mensaje; de lo contrario, se aplican los valores predeterminados de sesión/global.
- Envía `/trace` (o `/trace:`) sin argumentos para ver el nivel de traza actual.
- `/trace` es más estrecho que `/verbose`: solo expone líneas de traza/depuración propiedad de complementos, como los resúmenes de depuración de Active Memory.
- Las líneas de traza pueden aparecer en `/status` y como un mensaje de diagnóstico de seguimiento después de la respuesta normal del asistente.

## Visibilidad del razonamiento (/reasoning)

- Niveles: `on|off|stream`.
- El mensaje de solo directiva alterna si se muestran los bloques de pensamiento en las respuestas.
- Cuando está habilitado, el razonamiento se envía como un **mensaje separado** prefijado con `Reasoning:`.
- `stream` (solo Telegram): transmite el razonamiento a la burbuja de borrador de Telegram mientras se genera la respuesta, luego envía la respuesta final sin razonamiento.
- Alias: `/reason`.
- Envía `/reasoning` (o `/reasoning:`) sin argumentos para ver el nivel de razonamiento actual.
- Orden de resolución: directiva en línea, luego anulación de sesión, luego predeterminado por agente (`agents.list[].reasoningDefault`), luego respaldo (`off`).

## Relacionado

- La documentación del modo elevado se encuentra en [Elevated mode](/es/tools/elevated).

## Latidos

- El cuerpo de la sonda de latido es el prompt de latido configurado (predeterminado: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Las directivas en línea en un mensaje de latido se aplican como de costumbre (pero evite cambiar los valores predeterminados de la sesión desde los latidos).
- La entrega de latidos predetermina solo a la carga útil final. Para también enviar el mensaje separado `Reasoning:` (cuando esté disponible), establezca `agents.defaults.heartbeat.includeReasoning: true` o por agente `agents.list[].heartbeat.includeReasoning: true`.

## Interfaz de usuario de chat web

- El selector de pensamiento del chat web refleja el nivel almacenado de la sesión desde el almacenamiento/configuración de la sesión entrante cuando se carga la página.
- Al elegir otro nivel, se escribe la anulación de sesión inmediatamente a través de `sessions.patch`; no espera el siguiente envío y no es una anulación `thinkingOnce` de un solo uso.
- La primera opción es siempre `Default (<resolved level>)`, donde el valor predeterminado resuelto proviene del perfil de pensamiento del proveedor del modelo de sesión activo.
- El selector usa `thinkingOptions` devuelto por la fila de sesión de la puerta de enlace. La interfaz de usuario del navegador no mantiene su propia lista de expresiones regulares del proveedor; los complementos poseen conjuntos de niveles específicos del modelo.
- `/think:<level>` todavía funciona y actualiza el mismo nivel de sesión almacenado, por lo que las directivas de chat y el selector se mantienen sincronizados.

## Perfiles de proveedores

- Los complementos del proveedor pueden exponer `resolveThinkingProfile(ctx)` para definir los niveles admitidos y el valor predeterminado del modelo.
- Cada nivel de perfil tiene un `id` canónico almacenado (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive` o `max`) y puede incluir un `label` de visualización. Los proveedores binarios usan `{ id: "low", label: "on" }`.
- Los enlaces heredados publicados (`supportsXHighThinking`, `isBinaryThinking` y `resolveDefaultThinkingLevel`) permanecen como adaptadores de compatibilidad, pero los nuevos conjuntos de niveles personalizados deben usar `resolveThinkingProfile`.
- Las filas de la puerta de enlace exponen `thinkingOptions` y `thinkingDefault` para que los clientes de ACP/chat representen el mismo perfil que usa la validación en tiempo de ejecución.
