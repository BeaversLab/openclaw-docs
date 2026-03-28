---
summary: "Sintaxis de directivas para /think, /fast, /verbose y visibilidad del razonamiento"
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
  - Z.AI (`zai/*`) solo admite pensamiento binario (`on`/`off`). Cualquier nivel distinto de `off` se trata como `on` (asignado a `low`).
  - Moonshot (`moonshot/*`) asigna `/think off` a `thinking: { type: "disabled" }` y cualquier nivel distinto de `off` a `thinking: { type: "enabled" }`. Cuando el pensamiento está activado, Moonshot solo acepta `tool_choice` `auto|none`; OpenClaw normaliza los valores incompatibles a `auto`.

## Orden de resolución

1. Directiva en línea en el mensaje (se aplica solo a ese mensaje).
2. Invalidación de sesión (configurada mediante el envío de un mensaje que contiene solo la directiva).
3. Predeterminado por agente (`agents.list[].thinkingDefault` en la configuración).
4. Predeterminado global (`agents.defaults.thinkingDefault` en la configuración).
5. Alternativa: `adaptive` para los modelos Anthropic Claude 4.6, `low` para otros modelos con capacidad de razonamiento, `off` en caso contrario.

## Establecer un predeterminado de sesión

- Envíe un mensaje que sea **solo** la directiva (se permite el espacio en blanco), por ejemplo, `/think:medium` o `/t high`.
- Esto se mantiene para la sesión actual (por remitente de forma predeterminada); se borra con `/think:off` o al restablecer el inactividad de la sesión.
- Se envía una respuesta de confirmación (`Thinking level set to high.` / `Thinking disabled.`). Si el nivel no es válido (por ejemplo, `/thinking big`), se rechaza el comando con una sugerencia y el estado de la sesión permanece sin cambios.
- Envíe `/think` (o `/think:`) sin argumentos para ver el nivel de pensamiento actual.

## Aplicación por agente

- **Pi integrado**: el nivel resuelto se pasa al tiempo de ejecución del agente Pi en proceso.

## Modo rápido (/fast)

- Niveles: `on|off`.
- Un mensaje de solo directiva activa o desactiva la anulación del modo rápido de sesión y responde `Fast mode enabled.` / `Fast mode disabled.`.
- Envíe `/fast` (o `/fast status`) sin modo para ver el estado efectivo actual del modo rápido.
- OpenClaw resuelve el modo rápido en este orden:
  1. En línea/solo directiva `/fast on|off`
  2. Anulación de sesión
  3. Predeterminado por agente (`agents.list[].fastModeDefault`)
  4. Configuración por modelo: `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Alternativa: `off`
- Para `openai/*`, el modo rápido aplica el perfil rápido de OpenAI: `service_tier=priority` cuando es compatible, además de un bajo esfuerzo de razonamiento y una baja verbosidad de texto.
- Para `openai-codex/*`, el modo rápido aplica el mismo perfil de baja latencia en las respuestas de Codex. OpenClaw mantiene un interruptor `/fast` compartido entre ambas rutas de autenticación.
- Para solicitudes directas de clave de API `anthropic/*`, el modo rápido se asigna a los niveles de servicio de Anthropic: `/fast on` establece `service_tier=auto`, `/fast off` establece `service_tier=standard_only`.
- El modo rápido de Anthropic es solo para clave de API. OpenClaw omite la inyección del nivel de servicio de Anthropic para el token de configuración de Claude / autenticación OAuth y para URLs base de proxy que no sean de Anthropic.

## Directivas detalladas (/verbose o /v)

- Niveles: `on` (mínimo) | `full` | `off` (predeterminado).
- Un mensaje de solo directiva alterna el modo detallado de la sesión y responde `Verbose logging enabled.` / `Verbose logging disabled.`; los niveles no válidos devuelven una sugerencia sin cambiar el estado.
- `/verbose off` almacena una anulación explícita de la sesión; bórrela a través de la interfaz de usuario de Sesiones eligiendo `inherit`.
- La directiva en línea afecta solo ese mensaje; de lo contrario, se aplican los valores predeterminados de sesión/global.
- Envíe `/verbose` (o `/verbose:`) sin argumentos para ver el nivel detallado actual.
- Cuando el modo detallado está activado, los agentes que emiten resultados de herramientas estructurados (Pi, otros agentes JSON) devuelven cada llamada a herramienta como su propio mensaje de solo metadatos, prefijado con `<emoji> <tool-name>: <arg>` cuando está disponible (ruta/comando). Estos resúmenes de herramientas se envían tan pronto como cada herramienta se inicia (burbujas separadas), no como deltas de transmisión.
- Los resúmenes de fallos de herramientas permanecen visibles en modo normal, pero los sufijos de detalles de error sin procesar están ocultos a menos que el modo detallado sea `on` o `full`.
- Cuando el modo detallado es `full`, las salidas de las herramientas también se reenvían después de la finalización (burbuja separada, truncada a una longitud segura). Si alterna `/verbose on|full|off` mientras una ejecución está en curso, las burbujas de herramientas posteriores respetan la nueva configuración.

## Visibilidad del razonamiento (/reasoning)

- Niveles: `on|off|stream`.
- Un mensaje de solo directiva alterna si se muestran los bloques de pensamiento en las respuestas.
- Cuando está habilitado, el razonamiento se envía como un **mensaje separado** prefijado con `Reasoning:`.
- `stream` (solo Telegram): transmite el razonamiento a la burbuja de borrador de Telegram mientras se genera la respuesta y luego envía la respuesta final sin razonamiento.
- Alias: `/reason`.
- Envía `/reasoning` (o `/reasoning:`) sin argumentos para ver el nivel de razonamiento actual.
- Orden de resolución: directiva en línea, luego anulación de sesión, luego predeterminado por agente (`agents.list[].reasoningDefault`), luego alternativa (`off`).

## Relacionado

- La documentación del modo elevado se encuentra en [Elevated mode](/es/tools/elevated).

## Latidos

- El cuerpo de la sonda de latido es el prompt de latido configurado (predeterminado: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Las directivas en línea en un mensaje de latido se aplican como de costumbre (pero evite cambiar los valores predeterminados de la sesión desde los latidos).
- La entrega de latidos se predetermina solo a la carga final. Para también enviar el mensaje `Reasoning:` por separado (cuando esté disponible), configure `agents.defaults.heartbeat.includeReasoning: true` o por agente `agents.list[].heartbeat.includeReasoning: true`.

## Interfaz de usuario de chat web

- El selector de pensamiento del chat web refleja el nivel almacenado de la sesión desde el almacenamiento/configuración de la sesión entrante cuando se carga la página.
- Elegir otro nivel se aplica solo al siguiente mensaje (`thinkingOnce`); después de enviarlo, el selector vuelve al nivel de sesión almacenado.
- Para cambiar el valor predeterminado de la sesión, envíe una directiva `/think:<level>` (como antes); el selector lo reflejará después de la próxima recarga.
