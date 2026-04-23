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
  - `adaptive` solo se anuncia en los menús de comandos nativos y selectores para proveedores/modelos que declaran compatibilidad con el pensamiento adaptativo. Sigue siendo aceptado como una directiva escrita para la compatibilidad con las configuraciones y alias existentes.
  - `max` solo se anuncia en los menús de comandos nativos y selectores para proveedores/modelos que declaran compatibilidad con el pensamiento máximo. Las configuraciones almacenadas `max` existentes se reasignan al nivel de compatibilidad más grande para el modelo seleccionado cuando el modelo no admite `max`.
  - Los modelos Anthropic Claude 4.6 tienen como valor predeterminado `adaptive` cuando no se establece un nivel de pensamiento explícito.
  - Anthropic Claude Opus 4.7 no tiene como valor predeterminado el pensamiento adaptativo. Su valor predeterminado de esfuerzo de la API sigue siendo propiedad del proveedor a menos que establezca explícitamente un nivel de pensamiento.
  - Anthropic Claude Opus 4.7 asigna `/think xhigh` a pensamiento adaptativo más `output_config.effort: "xhigh"`, porque `/think` es una directiva de pensamiento y `xhigh` es la configuración de esfuerzo de Opus 4.7.
  - Anthropic Claude Opus 4.7 también expone `/think max`; se asigna a la misma ruta de esfuerzo máximo propiedad del proveedor.
  - Los modelos OpenAI GPT asignan `/think` a través de la compatibilidad con el esfuerzo de la API de Respuestas específica del modelo. `/think off` envía `reasoning.effort: "none"` solo cuando el modelo de destino lo admite; de lo contrario, OpenClaw omite la carga de razonamiento deshabilitada en lugar de enviar un valor no compatible.
  - MiniMax (`minimax/*`) en la ruta de transmisión compatible con Anthropic usa por defecto `thinking: { type: "disabled" }` a menos que establezcas explícitamente el pensamiento en los parámetros del modelo o de la solicitud. Esto evita deltas de `reasoning_content` filtrados del formato de transmisión Anthropic no nativo de MiniMax.
  - Z.AI (`zai/*`) solo admite pensamiento binario (`on`/`off`). Cualquier nivel distinto de `off` se trata como `on` (mapeado a `low`).
  - Moonshot (`moonshot/*`) mapea `/think off` a `thinking: { type: "disabled" }` y cualquier nivel distinto de `off` a `thinking: { type: "enabled" }`. Cuando el pensamiento está habilitado, Moonshot solo acepta `tool_choice` `auto|none`; OpenClaw normaliza los valores incompatibles a `auto`.

## Orden de resolución

1. Directiva en línea en el mensaje (se aplica solo a ese mensaje).
2. Anulación de sesión (establecida enviando un mensaje que contiene solo la directiva).
3. Valor predeterminado por agente (`agents.list[].thinkingDefault` en la configuración).
4. Valor predeterminado global (`agents.defaults.thinkingDefault` en la configuración).
5. Alternativa: `adaptive` para los modelos Anthropic Claude 4.6, `off` para Anthropic Claude Opus 4.7 a menos que se configure explícitamente, `low` para otros modelos con capacidad de razonamiento, `off` en caso contrario.

## Establecer un valor predeterminado de sesión

- Envía un mensaje que sea **solo** la directiva (se permite espacio en blanco), por ejemplo `/think:medium` o `/t high`.
- Esto se mantiene para la sesión actual (por remitente de forma predeterminada); se borra con `/think:off` o el reinicio por inactividad de la sesión.
- Se envía una respuesta de confirmación (`Thinking level set to high.` / `Thinking disabled.`). Si el nivel no es válido (por ejemplo, `/thinking big`), el comando se rechaza con una sugerencia y el estado de la sesión se mantiene sin cambios.
- Envía `/think` (o `/think:`) sin argumentos para ver el nivel de pensamiento actual.

## Aplicación por agente

- **Pi integrado**: el nivel resuelto se pasa al tiempo de ejecución del agente Pi en proceso.

## Modo rápido (/fast)

- Niveles: `on|off`.
- El mensaje de solo directiva activa o desactiva la anulación del modo rápido de la sesión y responde `Fast mode enabled.` / `Fast mode disabled.`.
- Envíe `/fast` (o `/fast status`) sin modo para ver el estado efectivo actual del modo rápido.
- OpenClaw resuelve el modo rápido en este orden:
  1. En línea/solo directiva `/fast on|off`
  2. Anulación de sesión
  3. Predeterminado por agente (`agents.list[].fastModeDefault`)
  4. Configuración por modelo: `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Alternativa: `off`
- Para `openai/*`, el modo rápido se asigna al procesamiento prioritario de OpenAI enviando `service_tier=priority` en las solicitudes de Responses compatibles.
- Para `openai-codex/*`, el modo rápido envía el mismo indicador `service_tier=priority` en las Responses de Codex. OpenClaw mantiene un interruptor compartido `/fast` en ambas rutas de autenticación.
- Para solicitudes `anthropic/*` públicas directas, incluido el tráfico autenticado con OAuth enviado a `api.anthropic.com`, el modo rápido se asigna a los niveles de servicio de Anthropic: `/fast on` establece `service_tier=auto`, `/fast off` establece `service_tier=standard_only`.
- Para `minimax/*` en la ruta compatible con Anthropic, `/fast on` (o `params.fastMode: true`) reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.
- Los parámetros del modelo `serviceTier` / `service_tier` explícitos de Anthropic anulan el valor predeterminado del modo rápido cuando ambos están establecidos. OpenClaw aún omite la inyección del nivel de servicio de Anthropic para URL base de proxy que no son de Anthropic.

## Directivas detalladas (/verbose o /v)

- Niveles: `on` (mínimo) | `full` | `off` (predeterminado).
- El mensaje de solo directiva activa o desactiva el modo detallado de la sesión y responde `Verbose logging enabled.` / `Verbose logging disabled.`; los niveles no válidos devuelven una sugerencia sin cambiar el estado.
- `/verbose off` almacena una anulación explícita de la sesión; bórrela a través de la IU de Sesiones eligiendo `inherit`.
- La directiva en línea afecta solo a ese mensaje; de lo contrario, se aplican los valores predeterminados de la sesión/global.
- Envíe `/verbose` (o `/verbose:`) sin argumentos para ver el nivel detallado actual.
- Cuando el modo detallado está activado, los agentes que emiten resultados de herramientas estructurados (Pi, otros agentes JSON) envían cada llamada de herramienta como su propio mensaje de solo metadatos, con el prefijo `<emoji> <tool-name>: <arg>` cuando está disponible (ruta/comando). Estos resúmenes de herramientas se envían tan pronto como cada herramienta se inicia (burbujas separadas), no como deltas de transmisión.
- Los resúmenes de fallos de herramientas permanecen visibles en modo normal, pero los sufijos de detalles de errores sin procesar están ocultos a menos que el modo detallado sea `on` o `full`.
- Cuando el modo detallado es `full`, las salidas de las herramientas también se reenvían después de completarse (burbuja separada, truncada a una longitud segura). Si alterna `/verbose on|full|off` mientras una ejecución está en curso, las burbujas de herramientas posteriores respetan la nueva configuración.

## Directivas de traza de complementos (/trace)

- Niveles: `on` | `off` (predeterminado).
- El mensaje de solo directiva alterna la salida de traza del complemento de la sesión y responde `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directiva en línea afecta solo a ese mensaje; de lo contrario, se aplican los valores predeterminados de la sesión/global.
- Envíe `/trace` (o `/trace:`) sin argumentos para ver el nivel de traza actual.
- `/trace` es más estrecho que `/verbose`: solo expone líneas de traza/depuración propiedad del complemento, como los resúmenes de depuración de Memoria Activa.
- Las líneas de traza pueden aparecer en `/status` y como un mensaje de diagnóstico de seguimiento después de la respuesta normal del asistente.

## Visibilidad del razonamiento (/reasoning)

- Niveles: `on|off|stream`.
- El mensaje de solo directiva alterna si se muestran los bloques de pensamiento en las respuestas.
- Cuando está habilitado, el razonamiento se envía como un **mensaje separado** con el prefijo `Reasoning:`.
- `stream` (solo Telegram): transmite el razonamiento a la burbuja de borrador de Telegram mientras se genera la respuesta, y luego envía la respuesta final sin razonamiento.
- Alias: `/reason`.
- Envíe `/reasoning` (o `/reasoning:`) sin argumentos para ver el nivel de razonamiento actual.
- Orden de resolución: directiva en línea, luego anulación de sesión, luego predeterminado por agente (`agents.list[].reasoningDefault`), luego reserva (`off`).

## Relacionado

- La documentación del modo elevado se encuentra en [Elevated mode](/es/tools/elevated).

## Latidos (Heartbeats)

- El cuerpo de la sonda de latido es el aviso de latido configurado (predeterminado: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Las directivas en línea en un mensaje de latido se aplican como de costumbre (pero evite cambiar los valores predeterminados de sesión desde los latidos).
- La entrega de latidos es solo para la carga útil final de manera predeterminada. Para también enviar el mensaje `Reasoning:` por separado (cuando esté disponible), establezca `agents.defaults.heartbeat.includeReasoning: true` o por agente `agents.list[].heartbeat.includeReasoning: true`.

## Interfaz de usuario del chat web

- El selector de pensamiento del chat web refleja el nivel almacenado de la sesión desde el almacén/configuración de la sesión entrante cuando se carga la página.
- Al elegir otro nivel, la anulación de sesión se escribe inmediatamente a través de `sessions.patch`; no espera el próximo envío y no es una anulación `thinkingOnce` de un solo uso.
- La primera opción es siempre `Default (<resolved level>)`, donde el valor predeterminado resuelto proviene del modelo de sesión activo: `adaptive` para Claude 4.6 en Anthropic, `off` para Anthropic Claude Opus 4.7 a menos que se configure, `low` para otros modelos con capacidad de razonamiento, `off` de lo contrario.
- El selector permanece consciente del proveedor:
  - la mayoría de los proveedores muestran `off | minimal | low | medium | high`
  - Anthropic/Bedrock Claude 4.6 muestra `off | minimal | low | medium | high | adaptive`
  - Anthropic Claude Opus 4.7 muestra `off | minimal | low | medium | high | xhigh | adaptive | max`
  - Z.AI muestra lo binario `off | on`
- `/think:<level>` todavía funciona y actualiza el mismo nivel de sesión almacenado, por lo que las directivas de chat y el selector permanecen sincronizados.
