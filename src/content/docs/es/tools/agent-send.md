---
summary: "Ejecuta turnos de agente desde la CLI y opcionalmente entrega respuestas a canales"
read_when:
  - You want to trigger agent runs from scripts or the command line
  - You need to deliver agent replies to a chat channel programmatically
title: "Envío de Agente"
---

# Envío de Agente

`openclaw agent` ejecuta un único turno de agente desde la línea de comandos sin necesidad
de un mensaje de chat entrante. Úselo para flujos de trabajo con scripts, pruebas y
entrega programática.

## Inicio rápido

<Steps>
  <Step title="Ejecutar un turno simple de agente">
    ```bash
    openclaw agent --message "What is the weather today?"
    ```

    Esto envía el mensaje a través del Gateway e imprime la respuesta.

  </Step>

  <Step title="Apuntar a un agente o sesión específico">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"
    ```

  </Step>

  <Step title="Entregar la respuesta a un canal">
    ```bash
    # Deliver to WhatsApp (default channel)
    openclaw agent --to +15555550123 --message "Report ready" --deliver

    # Deliver to Slack
    openclaw agent --agent ops --message "Generate report" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## Opciones (Flags)

| Opción                        | Descripción                                                              |
| ----------------------------- | ------------------------------------------------------------------------ |
| `--message \<text\>`          | Mensaje a enviar (requerido)                                             |
| `--to \<dest\>`               | Derivar clave de sesión de un objetivo (teléfono, id de chat)            |
| `--agent \<id\>`              | Apuntar a un agente configurado (usa su sesión `main`)                   |
| `--session-id \<id\>`         | Reutilizar una sesión existente por id                                   |
| `--local`                     | Forzar el tiempo de ejecución integrado local (omitir Gateway)           |
| `--deliver`                   | Enviar la respuesta a un canal de chat                                   |
| `--channel \<name\>`          | Canal de entrega (whatsapp, telegram, discord, slack, etc.)              |
| `--reply-to \<target\>`       | Anulación del objetivo de entrega                                        |
| `--reply-channel \<name\>`    | Anulación del canal de entrega                                           |
| `--reply-account \<id\>`      | Anulación del id de cuenta de entrega                                    |
| `--thinking \<level\>`        | Establecer nivel de pensamiento (off, minimal, low, medium, high, xhigh) |
| `--verbose \<on\|full\|off\>` | Establecer nivel detallado                                               |
| `--timeout \<seconds\>`       | Anular el tiempo de espera del agente                                    |
| `--json`                      | Imprimir JSON estructurado                                               |

## Comportamiento

- De forma predeterminada, la CLI pasa **a través del Gateway**. Agregue `--local` para forzar el
  tiempo de ejecución integrado en la máquina actual.
- Si el Gateway es inalcanzable, la CLI **retrocede** a la ejecución integrada local.
- Selección de sesión: `--to` deriva la clave de sesión (los objetivos de grupo/canal
  conservan el aislamiento; los chats directos se contraen a `main`).
- Las opciones thinking y verbose persisten en el almacenamiento de la sesión.
- Salida: texto plano por defecto, o `--json` para carga estructurada + metadatos.

## Ejemplos

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## Relacionado

- [Referencia de la CLI de Agent](/en/cli/agent)
- [Sub-agentes](/en/tools/subagents) — generación de sub-agentes en segundo plano
- [Sesiones](/en/concepts/session) — cómo funcionan las claves de sesión
