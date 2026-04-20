---
summary: "Sintaxis de directivas para /think, /fast, /verbose, /trace y visibilidad de razonamiento"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "Niveles de pensamiento"
---

# Niveles de pensamiento (directivas /think)

## Qué hace

- Directiva en línea en cualquier cuerpo entrante: `/t <level>`, `/think:<level>` o `/thinking <level>`.
- Niveles (alias): `off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink” (presupuesto máximo)
  - xhigh → “ultrathink+” (solo modelos GPT-5.2 + Codex)
  - adaptive → presupuesto de razonamiento adaptativo gestionado por el proveedor (compatible con la familia de modelos Anthropic Claude 4.6)
  - `x-high`, `x_high`, `extra-high`, `extra high` y `extra_high` se asignan a `xhigh`.
  - `highest`, `max` se asignan a `high`.
- Notas del proveedor:
  - Los modelos Anthropic Claude 4.6 utilizan por defecto `adaptive` cuando no se establece un nivel de pensamiento explícito.
  - MiniMax (`minimax/*`) en la ruta de transmisión compatible con Anthropic se establece por defecto en `thinking: { type: "disabled" }` a menos que establezcas explícitamente el pensamiento en los parámetros del modelo o de la solicitud. Esto evita deltas filtrados de `reasoning_content` del formato de transmisión Anthropic no nativo de MiniMax.
  - Z.AI (`zai/*`) solo admite pensamiento binario (`on`/`off`). Cualquier nivel que no sea `off` se trata como `on` (mapeado a `low`).
  - Moonshot (`moonshot/*`) mapea `/think off` a `thinking: { type: "disabled" }` y cualquier nivel que no sea `off` a `thinking: { type: "enabled" }`. Cuando el pensamiento está habilitado, Moonshot solo acepta `tool_choice` `auto|none`; OpenClaw normaliza los valores incompatibles a `auto`.

## Orden de resolución

1. Directiva en línea en el mensaje (se aplica solo a ese mensaje).
2. Anulación de sesión (establecida enviando un mensaje que solo contiene la directiva).
3. Predeterminado por agente (`agents.list[].thinkingDefault` en la configuración).
4. Predeterminado global (`agents.defaults.thinkingDefault` en la configuración).
5. Valor por defecto: `adaptive` para los modelos Anthropic Claude 4.6, `low` para otros modelos con capacidad de razonamiento, `off` en caso contrario.

## Establecer un predeterminado de sesión

- Envía un mensaje que sea **solo** la directiva (se permite el espacio en blanco), p. ej. `/think:medium` o `/t high`.
- Esto se mantiene para la sesión actual (por remitente de forma predeterminada); se borra con `/think:off` o por el reinicio por inactividad de la sesión.
- Se envía una respuesta de confirmación (`Thinking level set to high.` / `Thinking disabled.`). Si el nivel no es válido (p. ej. `/thinking big`), el comando se rechaza con una pista y el estado de la sesión se deja sin cambios.
- Envía `/think` (o `/think:`) sin argumentos para ver el nivel de pensamiento actual.

## Aplicación por agente

- **Embedded Pi**: el nivel resuelto se pasa al tiempo de ejecución del agente Pi en proceso.

## Modo rápido (/fast)

- Niveles: `on|off`.
- Un mensaje de solo directiva alterna la anulación del modo rápido de la sesión y responde `Fast mode enabled.` / `Fast mode disabled.`.
- Envíe `/fast` (o `/fast status`) sin modo para ver el estado efectivo actual del modo rápido.
- OpenClaw resuelve el modo rápido en este orden:
  1. En línea/solo directiva `/fast on|off`
  2. Anulación de sesión
  3. Predeterminado por agente (`agents.list[].fastModeDefault`)
  4. Configuración por modelo: `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Valor de reserva: `off`
- Para `openai/*`, el modo rápido se asigna al procesamiento prioritario de OpenAI enviando `service_tier=priority` en las solicitudes de Responses compatibles.
- Para `openai-codex/*`, el modo rápido envía el mismo indicador `service_tier=priority` en las Responses de Codex. OpenClaw mantiene un único interruptor `/fast` compartido en ambas rutas de autenticación.
- Para solicitudes directas públicas de `anthropic/*`, incluido el tráfico autenticado con OAuth enviado a `api.anthropic.com`, el modo rápido se asigna a los niveles de servicio de Anthropic: `/fast on` establece `service_tier=auto`, `/fast off` establece `service_tier=standard_only`.
- Para `minimax/*` en la ruta compatible con Anthropic, `/fast on` (o `params.fastMode: true`) reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.
- Los parámetros de modelo explícitos de Anthropic `serviceTier` / `service_tier` anulan el valor predeterminado del modo rápido cuando ambos están configurados. OpenClaw todavía omite la inyección de nivel de servicio de Anthropic para URL base de proxy que no sean de Anthropic.

## Directivas detalladas (/verbose o /v)

- Niveles: `on` (mínimo) | `full` | `off` (predeterminado).
- Un mensaje de solo directiva alterna el modo detallado de la sesión y responde `Verbose logging enabled.` / `Verbose logging disabled.`; los niveles no válidos devuelven una sugerencia sin cambiar el estado.
- `/verbose off` almacena una anulación de sesión explícita; bórrela a través de la interfaz de usuario de Sesiones eligiendo `inherit`.
- La directiva en línea solo afecta a ese mensaje; de lo contrario, se aplican los valores predeterminados de sesión/global.
- Envíe `/verbose` (o `/verbose:`) sin argumentos para ver el nivel detallado actual.
- Cuando el modo detallado está activado, los agentes que emiten resultados de herramientas estructurados (Pi, otros agentes JSON) devuelven cada llamada a herramienta como su propio mensaje de solo metadatos, con el prefijo `<emoji> <tool-name>: <arg>` cuando está disponible (ruta/comando). Estos resúmenes de herramientas se envían tan pronto como cada herramienta se inicia (burbujas separadas), no como deltas de transmisión.
- Los resúmenes de fallos de herramientas siguen siendo visibles en modo normal, pero los sufijos de detalles de errores sin procesar están ocultos a menos que el modo detallado sea `on` o `full`.
- Cuando el modo detallado es `full`, las salidas de las herramientas también se reenvían después de completarse (burbuja separada, truncadas a una longitud segura). Si activa `/verbose on|full|off` mientras se está ejecutando una tarea, las burbujas de herramientas posteriores respetan la nueva configuración.

## Directivas de traza de complementos (/trace)

- Niveles: `on` | `off` (predeterminado).
- El mensaje de solo directiva alterna la salida de traza del complemento de la sesión y responde `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directiva en línea afecta solo ese mensaje; de lo contrario, se aplican los valores predeterminados de la sesión/global.
- Envíe `/trace` (o `/trace:`) sin argumentos para ver el nivel de traza actual.
- `/trace` es más estrecho que `/verbose`: solo expone líneas de traza/depuración propias del complemento, como los resúmenes de depuración de Active Memory.
- Las líneas de traza pueden aparecer en `/status` y como un mensaje de diagnóstico de seguimiento después de la respuesta normal del asistente.

## Visibilidad de razonamiento (/reasoning)

- Niveles: `on|off|stream`.
- El mensaje de solo directiva alterna si se muestran los bloques de pensamiento en las respuestas.
- Cuando está habilitado, el razonamiento se envía como un **mensaje separado** prefijado con `Reasoning:`.
- `stream` (solo Telegram): transmite el razonamiento a la burbuja de borrador de Telegram mientras se genera la respuesta y luego envía la respuesta final sin razonamiento.
- Alias: `/reason`.
- Envíe `/reasoning` (o `/reasoning:`) sin argumentos para ver el nivel de razonamiento actual.
- Orden de resolución: directiva en línea, luego anulación de sesión, luego valor predeterminado por agente (`agents.list[].reasoningDefault`), luego alternativa (`off`).

## Relacionado

- La documentación del modo elevado se encuentra en [Modo elevado](/en/tools/elevated).

## Latidos

- El cuerpo de la sonda de latido es el mensaje de latido configurado (predeterminado: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Las directivas en línea en un mensaje de latido se aplican como de costumbre (pero evite cambiar los valores predeterminados de la sesión desde los latidos).
- La entrega de latidos predetermina solo a la carga útil final. Para también enviar el mensaje separado `Reasoning:` (cuando esté disponible), establezca `agents.defaults.heartbeat.includeReasoning: true` o `agents.list[].heartbeat.includeReasoning: true` por agente.

## Interfaz de usuario de chat web

- El selector de pensamiento del chat web refleja el nivel almacenado de la sesión desde el almacenamiento/configuración de la sesión entrante cuando se carga la página.
- Al elegir otro nivel, se escribe la invalidación de sesión inmediatamente a través de `sessions.patch`; no espera al siguiente envío y no es una invalidación de un solo uso `thinkingOnce`.
- La primera opción siempre es `Default (<resolved level>)`, donde el valor predeterminado resuelto proviene del modelo de sesión activo: `adaptive` para Claude 4.6 en Anthropic/Bedrock, `low` para otros modelos con capacidad de razonamiento, `off` en caso contrario.
- El selector permanece consciente del proveedor:
  - la mayoría de los proveedores muestran `off | minimal | low | medium | high | adaptive`
  - Z.AI muestra un binario `off | on`
- `/think:<level>` todavía funciona y actualiza el mismo nivel de sesión almacenado, por lo que las directivas de chat y el selector se mantienen sincronizados.
