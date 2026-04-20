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
  - xhigh → “ultrathink+” (modelos GPT-5.2 + Codex y esfuerzo de Anthropic Claude Opus 4.7)
  - adaptive → pensamiento adaptativo gestionado por el proveedor (compatible con Anthropic Claude 4.6 y Opus 4.7)
  - `x-high`, `x_high`, `extra-high`, `extra high` y `extra_high` se asignan a `xhigh`.
  - `highest`, `max` se asignan a `high`.
- Notas del proveedor:
  - Los modelos Anthropic Claude 4.6 utilizan por defecto `adaptive` cuando no se establece un nivel de pensamiento explícito.
  - Anthropic Claude Opus 4.7 no tiene como valor predeterminado el pensamiento adaptativo. Su valor predeterminado de esfuerzo de API sigue siendo propiedad del proveedor a menos que establezca explícitamente un nivel de pensamiento.
  - Anthropic Claude Opus 4.7 asigna `/think xhigh` al pensamiento adaptativo más `output_config.effort: "xhigh"`, porque `/think` es una directiva de pensamiento y `xhigh` es la configuración de esfuerzo de Opus 4.7.
  - MiniMax (`minimax/*`) en la ruta de transmisión compatible con Anthropic se establece de forma predeterminada en `thinking: { type: "disabled" }` a menos que establezca explícitamente el pensamiento en los parámetros del modelo o de la solicitud. Esto evita deltas `reasoning_content` filtrados del formato de transmisión Anthropic no nativo de MiniMax.
  - Z.AI (`zai/*`) solo admite pensamiento binario (`on`/`off`). Cualquier nivel distinto de `off` se trata como `on` (asignado a `low`).
  - Moonshot (`moonshot/*`) asigna `/think off` a `thinking: { type: "disabled" }` y cualquier nivel distinto de `off` a `thinking: { type: "enabled" }`. Cuando el pensamiento está habilitado, Moonshot solo acepta `tool_choice` `auto|none`; OpenClaw normaliza los valores incompatibles a `auto`.

## Orden de resolución

1. Directiva en línea en el mensaje (se aplica solo a ese mensaje).
2. Invalidación de sesión (establecida enviando un mensaje que solo contiene una directiva).
3. Valor predeterminado por agente (`agents.list[].thinkingDefault` en la configuración).
4. Valor predeterminado global (`agents.defaults.thinkingDefault` en la configuración).
5. Reserva: `adaptive` para modelos Anthropic Claude 4.6, `off` para Anthropic Claude Opus 4.7 a menos que se configure explícitamente, `low` para otros modelos con capacidad de razonamiento, `off` en caso contrario.

## Establecer un valor predeterminado de sesión

- Envíe un mensaje que sea **únicamente** la directiva (se permite el espacio en blanco), p. ej. `/think:medium` o `/t high`.
- Esto se mantiene para la sesión actual (por remitente de forma predeterminada); se borra con `/think:off` o al restablecer la sesión por inactividad.
- Se envía una respuesta de confirmación (`Thinking level set to high.` / `Thinking disabled.`). Si el nivel no es válido (p. ej. `/thinking big`), el comando se rechaza con una sugerencia y el estado de la sesión permanece sin cambios.
- Envíe `/think` (o `/think:`) sin argumentos para ver el nivel de pensamiento actual.

## Aplicación por agente

- **Pi integrado**: el nivel resuelto se pasa al tiempo de ejecución del agente Pi en proceso.

## Modo rápido (/fast)

- Niveles: `on|off`.
- Un mensaje de solo directiva activa o desactiva una anulación del modo rápido de la sesión y responde `Fast mode enabled.` / `Fast mode disabled.`.
- Envíe `/fast` (o `/fast status`) sin modo para ver el estado efectivo actual del modo rápido.
- OpenClaw resuelve el modo rápido en este orden:
  1. En línea/solo directiva `/fast on|off`
  2. Anulación de sesión
  3. Predeterminado por agente (`agents.list[].fastModeDefault`)
  4. Configuración por modelo: `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Respaldo: `off`
- Para `openai/*`, el modo rápido se asigna al procesamiento de prioridad de OpenAI enviando `service_tier=priority` en las solicitudes de Responses admitidas.
- Para `openai-codex/*`, el modo rápido envía el mismo indicador `service_tier=priority` en las Responses de Codex. OpenClaw mantiene un único interruptor compartido `/fast` en ambas rutas de autenticación.
- Para solicitudes directas públicas de `anthropic/*`, incluido el tráfico autenticado con OAuth enviado a `api.anthropic.com`, el modo rápido se asigna a los niveles de servicio de Anthropic: `/fast on` establece `service_tier=auto`, `/fast off` establece `service_tier=standard_only`.
- Para `minimax/*` en la ruta compatible con Anthropic, `/fast on` (o `params.fastMode: true`) reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.
- Los parámetros de modelo explícitos de Anthropic `serviceTier` / `service_tier` anulan el valor predeterminado del modo rápido cuando ambos están configurados. OpenClaw aún omite la inyección de nivel de servicio de Anthropic para URL base de proxy que no son de Anthropic.

## Directivas detalladas (/verbose o /v)

- Niveles: `on` (mínimo) | `full` | `off` (predeterminado).
- Un mensaje de solo directiva alterna el modo detallado de la sesión y responde `Verbose logging enabled.` / `Verbose logging disabled.`; los niveles no válidos devuelven una sugerencia sin cambiar el estado.
- `/verbose off` almacena una anulación explícita de la sesión; bórrela a través de la interfaz de usuario de Sesiones eligiendo `inherit`.
- La directiva en línea afecta solo ese mensaje; de lo contrario, se aplican los valores predeterminados de la sesión/global.
- Envíe `/verbose` (o `/verbose:`) sin argumentos para ver el nivel detallado actual.
- Cuando el modo detallado está activado, los agentes que emiten resultados de herramientas estructurados (Pi, otros agentes JSON) envían cada llamada de herramienta como su propio mensaje de solo metadatos, con el prefijo `<emoji> <tool-name>: <arg>` cuando está disponible (ruta/comando). Estos resúmenes de herramientas se envían tan pronto como cada herramienta se inicia (burbujas separadas), no como deltas de transmisión.
- Los resúmenes de fallos de herramientas siguen siendo visibles en modo normal, pero los sufijos de detalles de errores sin procesar están ocultos a menos que el modo detallado sea `on` o `full`.
- Cuando el modo detallado es `full`, las salidas de las herramientas también se reenvían después de completarse (burbuja separada, truncada a una longitud segura). Si cambia `/verbose on|full|off` mientras una ejecución está en curso, las siguientes burbujas de herramientas respetarán la nueva configuración.

## Directivas de seguimiento de complementos (/trace)

- Niveles: `on` | `off` (predeterminado).
- Un mensaje de solo directiva alterna la salida de seguimiento de complementos de la sesión y responde `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directiva en línea afecta solo ese mensaje; de lo contrario, se aplican los valores predeterminados de la sesión/global.
- Envíe `/trace` (o `/trace:`) sin argumentos para ver el nivel de seguimiento actual.
- `/trace` es más específico que `/verbose`: solo expone líneas de seguimiento/depuración propiedad del complemento, como los resúmenes de depuración de Active Memory.
- Las líneas de seguimiento pueden aparecer en `/status` y como un mensaje de diagnóstico de seguimiento después de la respuesta normal del asistente.

## Visibilidad del razonamiento (/reasoning)

- Niveles: `on|off|stream`.
- El mensaje de solo directiva alterna si se muestran los bloques de pensamiento en las respuestas.
- Cuando está habilitado, el razonamiento se envía como un **mensaje separado** prefijado con `Reasoning:`.
- `stream` (solo Telegram): transmite el razonamiento a la burbuja de borrador de Telegram mientras se genera la respuesta y luego envía la respuesta final sin razonamiento.
- Alias: `/reason`.
- Envíe `/reasoning` (o `/reasoning:`) sin argumentos para ver el nivel de razonamiento actual.
- Orden de resolución: directiva en línea, luego anulación de sesión, luego valor predeterminado por agente (`agents.list[].reasoningDefault`), luego alternativa (`off`).

## Relacionado

- La documentación del modo elevado se encuentra en [Modo elevado](/es/tools/elevated).

## Latidos

- El cuerpo de la sonda de latido es el aviso de latido configurado (predeterminado: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Las directivas en línea en un mensaje de latido se aplican como de costumbre (pero evite cambiar los valores predeterminados de la sesión desde los latidos).
- La entrega de latidos predetermina solo a la carga final. Para enviar también el mensaje separado `Reasoning:` (cuando esté disponible), configure `agents.defaults.heartbeat.includeReasoning: true` o el `agents.list[].heartbeat.includeReasoning: true` por agente.

## Interfaz de usuario de chat web

- El selector de pensamiento del chat web refleja el nivel almacenado de la sesión desde el almacenamiento/configuración de la sesión entrante cuando se carga la página.
- Al elegir otro nivel, se escribe la anulación de sesión inmediatamente a través de `sessions.patch`; no espera al siguiente envío y no es una anulación `thinkingOnce` de un solo uso.
- La primera opción es siempre `Default (<resolved level>)`, donde el predeterminado resuelto proviene del modelo de sesión activo: `adaptive` para Claude 4.6 en Anthropic, `off` para Anthropic Claude Opus 4.7 a menos que se configure, `low` para otros modelos con capacidad de razonamiento, `off` en caso contrario.
- El selector permanece consciente del proveedor:
  - la mayoría de los proveedores muestran `off | minimal | low | medium | high | adaptive`
  - Anthropic Claude Opus 4.7 muestra `off | minimal | low | medium | high | xhigh | adaptive`
  - Z.AI muestra `off | on` binario
- `/think:<level>` todavía funciona y actualiza el mismo nivel de sesión almacenado, por lo que las directivas de chat y el selector permanecen sincronizados.
