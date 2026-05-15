---
summary: "Referencia de la CLI para `openclaw agent` (enviar una vuelta de agente a través de la puerta de enlace)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "Agente"
---

# `openclaw agent`

Ejecuta una vuelta de agente a través de la puerta de enlace (usa `--local` para embebido).
Usa `--agent <id>` para dirigirte a un agente configurado directamente.

Pase al menos un selector de sesión:

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

Relacionado:

- Herramienta de envío de agente: [Envío de agente](/es/tools/agent-send)

## Opciones

- `-m, --message <text>`: cuerpo del mensaje requerido
- `-t, --to <dest>`: destinatario utilizado para derivar la clave de sesión
- `--session-id <id>`: identificador de sesión explícito
- `--agent <id>`: identificador del agente; anula los enlaces de enrutamiento
- `--model <id>`: anulación del modelo para esta ejecución (`provider/model` o id del modelo)
- `--thinking <level>`: nivel de pensamiento del agente (`off`, `minimal`, `low`, `medium`, `high`, además de niveles personalizados admitidos por el proveedor como `xhigh`, `adaptive` o `max`)
- `--verbose <on|off>`: conservar el nivel detallado para la sesión
- `--channel <channel>`: canal de entrega; omitir para usar el canal de la sesión principal
- `--reply-to <target>`: anulación del destino de entrega
- `--reply-channel <channel>`: anulación del canal de entrega
- `--reply-account <id>`: anulación de la cuenta de entrega
- `--local`: ejecutar el agente integrado directamente (después de la precarga del registro de complementos)
- `--deliver`: enviar la respuesta de vuelta al canal/destino seleccionado
- `--timeout <seconds>`: anular el tiempo de espera del agente (predeterminado 600 o valor de configuración)
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

- El modo de Gateway recurre al agente integrado cuando falla la solicitud de Gateway. Use `--local` para forzar la ejecución integrada de antemano.
- `--local` todavía precarga el registro de complementos primero, por lo que los proveedores, herramientas y canales proporcionados por los complementos permanecen disponibles durante las ejecuciones integradas.
- Las ejecuciones de `--local` y las de reserva integradas se tratan como ejecuciones únicas. Los recursos de bucle invertido MCP agrupados y las sesiones stdio de Claude activadas abiertas para ese proceso local se retiran después de la respuesta, por lo que las invocaciones desde scripts no mantienen los procesos secundarios locales activos.
- Las ejecuciones respaldadas por Gateway dejan los recursos de bucle invertido MCP propiedad de Gateway bajo el proceso Gateway en ejecución; los clientes antiguos aún pueden enviar el indicador histórico de limpieza, pero Gateway lo acepta como una operación nula de compatibilidad.
- `--channel`, `--reply-channel` y `--reply-account` afectan la entrega de la respuesta, no el enrutamiento de la sesión.
- `--json` mantiene stdout reservado para la respuesta JSON. Los diagnósticos de Gateway, complemento y reserva integrada se enrutan a stderr para que los scripts puedan analizar stdout directamente.
- El JSON de reserva integrado incluye `meta.transport: "embedded"` y `meta.fallbackFrom: "gateway"` para que los scripts puedan distinguir las ejecuciones de reserva de las ejecuciones de Gateway.
- Si Gateway acepta una ejecución de agente pero la CLI agota el tiempo de espera esperando la respuesta final, la reserva integrada utiliza un nuevo id. de sesión/ejecución `gateway-fallback-*` explícito e informa `meta.fallbackReason: "gateway_timeout"` más los campos de sesión de reserva. Esto evita competir con el bloqueo de transcripción propiedad de Gateway o reemplazar silenciosamente la sesión de conversación enrutada original.
- Cuando este comando activa la regeneración de `models.json`, las credenciales del proveedor administradas por SecretRef se conservan como marcadores no secretos (por ejemplo, nombres de variables de entorno, `secretref-env:ENV_VAR_NAME` o `secretref-managed`), no como texto plano de secreto resuelto.
- Las escrituras de marcadores son de origen autorizado: OpenClaw conserva los marcadores a partir de la instantánea de configuración de origen activa, no a partir de valores secretos de tiempo de ejecución resueltos.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Tiempo de ejecución del agente](/es/concepts/agent)
