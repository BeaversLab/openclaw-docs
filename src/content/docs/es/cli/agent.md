---
summary: "Referencia de CLI para `openclaw agent` (envía un turno de agente a través del Gateway)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "Agente"
---

# `openclaw agent`

Ejecuta un turno de agente a través del Gateway (usa `--local` para embedded).
Usa `--agent <id>` para apuntar a un agente configurado directamente.

Pase al menos un selector de sesión:

- `--to <dest>`
- `--session-key <key>`
- `--session-id <id>`
- `--agent <id>`

Relacionado:

- Herramienta de envío de agente: [Agent send](/es/tools/agent-send)

## Opciones

- `-m, --message <text>`: cuerpo del mensaje requerido
- `-t, --to <dest>`: destinatario utilizado para derivar la clave de sesión
- `--session-key <key>`: clave de sesión explícita para usar en el enrutamiento
- `--session-id <id>`: id de sesión explícito
- `--agent <id>`: id del agente; anula los enlaces de enrutamiento
- `--model <id>`: anulación del modelo para esta ejecución (`provider/model` o id del modelo)
- `--thinking <level>`: nivel de pensamiento del agente (`off`, `minimal`, `low`, `medium`, `high`, además de niveles personalizados compatibles con el proveedor como `xhigh`, `adaptive` o `max`)
- `--verbose <on|off>`: persistir el nivel detallado para la sesión
- `--channel <channel>`: canal de entrega; omitir para usar el canal de sesión principal
- `--reply-to <target>`: anulación del destino de entrega
- `--reply-channel <channel>`: anulación del canal de entrega
- `--reply-account <id>`: anulación de la cuenta de entrega
- `--local`: ejecutar el agente integrado directamente (después de la precarga del registro de complementos)
- `--deliver`: enviar la respuesta de vuelta al canal/destino seleccionado
- `--timeout <seconds>`: anular el tiempo de espera del agente (por defecto 600 o valor de configuración)
- `--json`: salida JSON

## Ejemplos

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## Notas

- El modo de Gateway vuelve al agente integrado cuando falla la solicitud de Gateway. Use `--local` para forzar la ejecución integrada de antemano.
- `--local` todavía precarga el registro de complementos primero, por lo que los proveedores, herramientas y canales proporcionados por el complement siguen disponibles durante las ejecuciones integradas.
- Las ejecuciones de `--local` y la ejecución de reserva integrada se tratan como ejecuciones únicas (one-shot). Los recursos de bucle invertido de MCP incluidos y las sesiones stdio de Claude calentadas abiertas para ese proceso local se retiran después de la respuesta, por lo que las invocaciones mediante scripts no mantienen los procesos secundarios locales activos.
- Las ejecuciones respaldadas por Gateway dejan los recursos de bucle invertido de MCP propiedad de Gateway bajo el proceso Gateway en ejecución; los clientes antiguos aún pueden enviar el indicador de limpieza histórico, pero Gateway lo acepta como una operación nula de compatibilidad.
- `--channel`, `--reply-channel` y `--reply-account` afectan la entrega de la respuesta, no el enrutamiento de la sesión.
- `--session-key` selecciona una clave de sesión explícita. Las claves con prefijo de agente deben usar `agent:<agent-id>:<session-key>`, y `--agent` debe coincidir con el id del agente de la clave cuando se proporcionan ambos. Las claves simples que no son centinela se limitan a `--agent` cuando se suministran, o al agente predeterminado configurado en caso contrario; por ejemplo, `--agent ops --session-key incident-42` se enruta a `agent:ops:incident-42`. Los literales `global` y `unknown` permanecen sin ámbito solo cuando no se proporciona ningún `--agent`; en ese caso, la reserva integrada y la propiedad de la tienda utilizan el agente predeterminado configurado.
- `--json` mantiene stdout reservado para la respuesta JSON. Los diagnósticos de Gateway, complementos y reserva integrada se enrutan a stderr para que los scripts puedan analizar stdout directamente.
- El JSON de reserva integrado incluye `meta.transport: "embedded"` y `meta.fallbackFrom: "gateway"` para que los scripts puedan distinguir las ejecuciones de reserva de las ejecuciones de Gateway.
- Si Gateway acepta una ejecución de agente pero la CLI agota el tiempo de espera esperando la respuesta final, la reserva integrada utiliza un nuevo id de sesión/ejecución `gateway-fallback-*` explícito e informa `meta.fallbackReason: "gateway_timeout"` más los campos de sesión de reserva. Esto evita competir con el bloqueo de transcripción propiedad de Gateway o reemplazar silenciosamente la sesión de conversación enrutada original.
- Para las ejecuciones respaldadas por Gateway, `SIGTERM` y `SIGINT` interrumpen la solicitud de CLI en espera. Si el Gateway ya ha aceptado la ejecución, la CLI también envía `chat.abort` para ese id de ejecución aceptado antes de salir. Las ejecuciones locales de `--local` y las ejecuciones de reserva integradas reciben la misma señal de aborto, pero no envían `chat.abort`. Si un `--run-id` duplicado llega al Gateway mientras la ejecución del agente original aún está activa, la respuesta duplicada informa `status: "in_flight"` y la CLI que no es JSON imprime un diagnóstico en stderr en lugar de una respuesta vacía. Para contenedores externos de cron/systemd, mantenga un tope de finalización forzada externo como `timeout -k 60 600 openclaw agent ...` para que el supervisor todavía pueda recolectar el proceso si el apagado no puede drenar.
- Cuando este comando activa la regeneración de `models.json`, las credenciales del proveedor administradas por SecretRef se persisten como marcadores no secretos (por ejemplo, nombres de variables de entorno, `secretref-env:ENV_VAR_NAME` o `secretref-managed`), no como texto plano de secreto resuelto.
- Las escrituras de marcadores son autoritativas en la fuente: OpenClaw persiste los marcadores a partir de la instantánea de configuración de la fuente activa, no a partir de los valores secretos de tiempo de ejecución resueltos.

## Estado de entrega JSON

Cuando se usa `--json --deliver`, la respuesta JSON de la CLI puede incluir `deliveryStatus` de nivel superior para que los scripts puedan distinguir envíos entregados, suprimidos, parciales y fallidos:

```json
{
  "payloads": [{ "text": "Report ready", "mediaUrl": null }],
  "meta": { "durationMs": 1200 },
  "deliveryStatus": {
    "requested": true,
    "attempted": true,
    "status": "sent",
    "succeeded": true,
    "resultCount": 1
  }
}
```

`deliveryStatus.status` es uno de `sent`, `suppressed`, `partial_failed` o `failed`. `suppressed` significa que la entrega no se envió intencionalmente, por ejemplo, un gancho de envío de mensajes la canceló o no hubo resultado visible; sigue siendo un resultado terminal sin reintentos. `partial_failed` significa que al menos una carga útil se envió antes de que fallara una carga posterior. `failed` significa que no se completó ningún envío duradero o falló la verificación previa de entrega.

Las respuestas de la CLI respaldadas por Gateway también conservan la forma del resultado sin procesar del Gateway, donde el mismo objeto está disponible en `result.deliveryStatus`.

Campos comunes:

- `requested`: siempre `true` cuando el objeto está presente.
- `attempted`: `true` después de que se ejecutó la ruta de envío duradero; `false` para fallos de preflight o sin cargas útiles visibles.
- `succeeded`: `true`, `false` o `"partial"`; `"partial"` se combina con `status: "partial_failed"`.
- `reason`: un motivo en snake_case en minúsculas de la entrega duradera o validación de preflight. Los motivos conocidos incluyen `cancelled_by_message_sending_hook`, `no_visible_payload`, `no_visible_result`, `channel_resolved_to_internal`, `unknown_channel`, `invalid_delivery_target` y `no_delivery_target`; los envíos duraderos fallidos también pueden informar la etapa fallida. Trate los valores desconocidos como opacos porque el conjunto puede expandirse.
- `resultCount`: número de resultados de envío del canal cuando están disponibles.
- `sentBeforeError`: `true` cuando un fallo parcial envió al menos una carga útil antes del error.
- `error`: booleano `true` para envíos fallidos o parcialmente fallidos.
- `errorMessage`: incluido solo cuando se captura un mensaje de error de entrega subyacente. Los fallos de preflight llevan `error` y `reason` pero no `errorMessage`.
- `payloadOutcomes`: resultados opcionales por carga útil con `index`, `status`, `reason`, `resultCount`, `error`, `stage`, `sentBeforeError` o metadatos de hook cuando están disponibles.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Tiempo de ejecución del agente](/es/concepts/agent)
