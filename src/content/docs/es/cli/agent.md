---
summary: "Referencia de la CLI para `openclaw agent` (enviar una vuelta de agente a través de la puerta de enlace)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agente"
---

# `openclaw agent`

Ejecuta una vuelta de agente a través de la puerta de enlace (usa `--local` para embebido).
Usa `--agent <id>` para dirigirte a un agente configurado directamente.

Pase al menos un selector de sesión:

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

Relacionado:

- Herramienta de envío del agente: [Agent send](/en/tools/agent-send)

## Opciones

- `-m, --message <text>`: cuerpo del mensaje requerido
- `-t, --to <dest>`: destinatario utilizado para derivar la clave de sesión
- `--session-id <id>`: identificador de sesión explícito
- `--agent <id>`: identificador del agente; anula los enlaces de enrutamiento
- `--thinking <off|minimal|low|medium|high|xhigh>`: nivel de pensamiento del agente
- `--verbose <on|off>`: persistir el nivel detallado para la sesión
- `--channel <channel>`: canal de entrega; omita para usar el canal de sesión principal
- `--reply-to <target>`: anulación del destino de entrega
- `--reply-channel <channel>`: anulación del canal de entrega
- `--reply-account <id>`: anulación de la cuenta de entrega
- `--local`: ejecutar el agente integrado directamente (después de la precarga del registro del complemento)
- `--deliver`: enviar la respuesta de vuelta al canal/destino seleccionado
- `--timeout <seconds>`: anular el tiempo de espera del agente (predeterminado 600 o valor de configuración)
- `--json`: salida JSON

## Ejemplos

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## Notas

- El modo de Gateway vuelve al agente integrado cuando falla la solicitud de Gateway. Use `--local` para forzar la ejecución integrada de antemano.
- `--local` todavía precarga el registro del complemento primero, por lo que los proveedores, herramientas y canales proporcionados por el complemento siguen disponibles durante las ejecuciones integradas.
- `--channel`, `--reply-channel` y `--reply-account` afectan la entrega de la respuesta, no el enrutamiento de la sesión.
- Cuando este comando activa la regeneración de `models.json`, las credenciales del proveedor administradas por SecretRef se persisten como marcadores no secretos (por ejemplo, nombres de variables de entorno, `secretref-env:ENV_VAR_NAME` o `secretref-managed`), no como texto plano de secreto resuelto.
- Las escrituras de marcadores son autoritativas de la fuente: OpenClaw persiste los marcadores desde la instantánea de configuración de la fuente activa, no desde los valores secretos resueltos en tiempo de ejecución.
