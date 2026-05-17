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
- `--session-id <id>`
- `--agent <id>`

Relacionado:

- Herramienta de envío de agente: [Agent send](/es/tools/agent-send)

## Opciones

- `-m, --message <text>`: cuerpo del mensaje requerido
- `-t, --to <dest>`: destinatario utilizado para derivar la clave de sesión
- `--session-id <id>`: id de sesión explícito
- `--agent <id>`: id de agente; anula los enlaces de enrutamiento
- `--model <id>`: anulación de modelo para esta ejecución (`provider/model` o id de modelo)
- `--thinking <level>`: nivel de pensamiento del agente (`off`, `minimal`, `low`, `medium`, `high`, más niveles personalizados compatibles con el proveedor como `xhigh`, `adaptive` o `max`)
- `--verbose <on|off>`: persistir el nivel detallado para la sesión
- `--channel <channel>`: canal de entrega; omitir para usar el canal de sesión principal
- `--reply-to <target>`: anulación del destino de entrega
- `--reply-channel <channel>`: anulación del canal de entrega
- `--reply-account <id>`: anulación de la cuenta de entrega
- `--local`: ejecuta el agente integrado directamente (después de la precarga del registro de complementos)
- `--deliver`: envía la respuesta de vuelta al canal/destino seleccionado
- `--timeout <seconds>`: anula el tiempo de espera del agente (predeterminado 600 o valor de configuración)
- `--json`: salida JSON

## Ejemplos

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## Notas

- El modo Gateway vuelve al agente integrado cuando falla la solicitud del Gateway. Usa `--local` para forzar la ejecución integrada de antemano.
- `--local` todavía precarga el registro de complementos primero, por lo que los proveedores, herramientas y canales proporcionados por el complemento siguen disponibles durante las ejecuciones integradas.
- Las ejecuciones de `--local` y las de reserva integradas se tratan como ejecuciones únicas. Los recursos de bucle de retorno de MCP incluidos y las sesiones stdio de Claude calentadas abiertas para ese proceso local se retiran después de la respuesta, por lo que las invocaciones desde scripts no mantienen los procesos secundarios locales activos.
- Las ejecuciones respaldadas por Gateway dejan los recursos de bucle invertido MCP propiedad de Gateway bajo el proceso Gateway en ejecución; los clientes antiguos aún pueden enviar el indicador histórico de limpieza, pero Gateway lo acepta como una operación nula de compatibilidad.
- `--channel`, `--reply-channel` y `--reply-account` afectan la entrega de la respuesta, no el enrutamiento de la sesión.
- `--json` mantiene stdout reservado para la respuesta JSON. Los diagnósticos de Gateway, complemento y reserva integrada se enrutan a stderr para que los scripts puedan analizar stdout directamente.
- El JSON de reserva integrado incluye `meta.transport: "embedded"` y `meta.fallbackFrom: "gateway"` para que los scripts puedan distinguir las ejecuciones de reserva de las ejecuciones de Gateway.
- Si el Gateway acepta una ejecución de agente pero la CLI excede el tiempo de espera esperando la respuesta final, la reserva integrada utiliza un id de sesión/ejecución `gateway-fallback-*` explícito nuevo e informa `meta.fallbackReason: "gateway_timeout"` más los campos de la sesión de reserva. Esto evita competir con el bloqueo de la transcripción propiedad del Gateway o reemplazar silenciosamente la sesión de conversación enrutada original.
- Cuando este comando activa la regeneración de `models.json`, las credenciales del proveedor administradas por SecretRef se persisten como marcadores no secretos (por ejemplo, nombres de variables de entorno, `secretref-env:ENV_VAR_NAME` o `secretref-managed`), no como texto plano de secreto resuelto.
- Las escrituras de marcadores son de origen autorizado: OpenClaw conserva los marcadores a partir de la instantánea de configuración de origen activa, no a partir de valores secretos de tiempo de ejecución resueltos.

## Estado de entrega JSON

Cuando se usa `--json --deliver`, la respuesta JSON de la CLI puede incluir `deliveryStatus` de nivel superior para que los scripts puedan distinguir los envíos entregados, suprimidos, parciales y fallidos:

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

`deliveryStatus.status` es uno de `sent`, `suppressed`, `partial_failed` o `failed`. `suppressed` significa que la entrega no se envió intencionalmente, por ejemplo, un enlace de envío de mensajes lo canceló o no hubo un resultado visible; sigue siendo un resultado terminal sin reintentos. `partial_failed` significa que se envió al menos una carga útil antes de que fallara una carga útil posterior. `failed` significa que no se completó ningún envío duradero o que la verificación previa de la entrega falló.

Las respuestas de la CLI respaldadas por Gateway también conservan la forma del resultado sin procesar de Gateway, donde el mismo objeto está disponible en `result.deliveryStatus`.

Campos comunes:

- `requested`: siempre `true` cuando el objeto está presente.
- `attempted`: `true` después de que se ejecutó la ruta de envío duradero; `false` para fallos de verificación previa o sin cargas útiles visibles.
- `succeeded`: `true`, `false` o `"partial"`; `"partial"` se empareja con `status: "partial_failed"`.
- `reason`: un motivo en snake_case en minúsculas de la entrega duradera o la validación previa. Los motivos conocidos incluyen `cancelled_by_message_sending_hook`, `no_visible_payload`, `no_visible_result`, `channel_resolved_to_internal`, `unknown_channel`, `invalid_delivery_target` y `no_delivery_target`; los envíos duraderos fallidos también pueden informar la etapa fallida. Trate los valores desconocidos como opacos porque el conjunto puede expandirse.
- `resultCount`: número de resultados de envío del canal cuando están disponibles.
- `sentBeforeError`: `true` cuando un fallo parcial envió al menos una carga útil antes del error.
- `error`: booleano `true` para envíos fallidos o con fallo parcial.
- `errorMessage`: incluido solo cuando se captura un mensaje de error de entrega subyacente. Los fallos de previsualización conllevan `error` y `reason` pero ningún `errorMessage`.
- `payloadOutcomes`: resultados opcionales por carga útil con `index`, `status`, `reason`, `resultCount`, `error`, `stage`, `sentBeforeError`, o metadatos del gancho cuando estén disponibles.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Tiempo de ejecución del agente](/es/concepts/agent)
