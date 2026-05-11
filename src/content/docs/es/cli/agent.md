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
- Cada invocación de `openclaw agent` se trata como una ejecución única. Los servidores MCP agrupados o configurados por el usuario que se abrieron para esa ejecución se retiran después de la respuesta, incluso cuando el comando usa la ruta de Gateway, por lo que los procesos secundarios de stdio MCP no permanecen vivos entre invocaciones de scripts.
- `--channel`, `--reply-channel` y `--reply-account` afectan la entrega de respuestas, no el enrutamiento de la sesión.
- `--json` mantiene stdout reservado para la respuesta JSON. Los diagnósticos de Gateway, complemento y reserva integrada se enrutan a stderr para que los scripts puedan analizar stdout directamente.
- El JSON de reserva (fallback) integrado incluye `meta.transport: "embedded"` y `meta.fallbackFrom: "gateway"` para que los scripts puedan distinguir las ejecuciones de reserva de las ejecuciones del Gateway.
- Cuando este comando activa la regeneración de `models.json`, las credenciales del proveedor administradas por SecretRef se guardan como marcadores no secretos (por ejemplo, nombres de variables de entorno, `secretref-env:ENV_VAR_NAME` o `secretref-managed`), no como texto plano de secretos resueltos.
- Las escrituras de marcadores tienen autoridad de origen: OpenClaw conserva los marcadores a partir de la instantánea de configuración de origen activa, no a partir de los valores de secretos en tiempo de ejecución resueltos.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Tiempo de ejecución del agente](/es/concepts/agent)
