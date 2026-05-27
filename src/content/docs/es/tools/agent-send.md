---
summary: "Ejecuta turnos de agente desde la CLI y opcionalmente entrega respuestas a canales"
read_when:
  - You want to trigger agent runs from scripts or the command line
  - You need to deliver agent replies to a chat channel programmatically
title: "Envío de agente"
---

`openclaw agent` ejecuta un solo turno de agente desde la línea de comandos sin necesidad
de un mensaje de chat entrante. Úselo para flujos de trabajo con guiones, pruebas y
entrega programática.

## Inicio rápido

<Steps>
  <Step title="Ejecutar un turno simple de agente">
    ```bash
    openclaw agent --agent main --message "What is the weather today?"
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

    # Target an exact session key
    openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
    ```

  </Step>

  <Step title="Enviar la respuesta a un canal">
    ```bash
    # Deliver to WhatsApp (default channel)
    openclaw agent --to +15555550123 --message "Report ready" --deliver

    # Deliver to Slack
    openclaw agent --agent ops --message "Generate report" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## Opciones

| Opción                        | Descripción                                                              |
| ----------------------------- | ------------------------------------------------------------------------ |
| `--message \<text\>`          | Mensaje a enviar (obligatorio)                                           |
| `--to \<dest\>`               | Derivar clave de sesión de un objetivo (teléfono, id de chat)            |
| `--session-key \<key\>`       | Usar una clave de sesión explícita                                       |
| `--agent \<id\>`              | Apuntar a un agente configurado (usa su sesión `main`)                   |
| `--session-id \<id\>`         | Reutilizar una sesión existente por id                                   |
| `--local`                     | Forzar el tiempo de ejecución integrado local (omitir Gateway)           |
| `--deliver`                   | Enviar la respuesta a un canal de chat                                   |
| `--channel \<name\>`          | Canal de entrega (whatsapp, telegram, discord, slack, etc.)              |
| `--reply-to \<target\>`       | Anulación del destino de entrega                                         |
| `--reply-channel \<name\>`    | Anulación del canal de entrega                                           |
| `--reply-account \<id\>`      | Anulación del id de cuenta de entrega                                    |
| `--thinking \<level\>`        | Establecer el nivel de pensamiento para el perfil de modelo seleccionado |
| `--verbose \<on\|full\|off\>` | Establecer el nivel detallado (verbose)                                  |
| `--timeout \<seconds\>`       | Anular el tiempo de espera del agente                                    |
| `--json`                      | Salir JSON estructurado                                                  |

## Comportamiento

- De forma predeterminada, la CLI va **a través del Gateway**. Agregue `--local` para forzar el
  tiempo de ejecución integrado en la máquina actual.
- Si el Gateway es inalcanzable, la CLI **retrocede** a la ejecución integrada local.
- Selección de sesión: `--to` deriva la clave de sesión (los objetivos de grupo/canal
  preservan el aislamiento; los chats directos colapsan a `main`).
- `--session-key` selecciona una clave explícita. Las claves con prefijo de agente deben usar
  `agent:<agent-id>:<session-key>`, y `--agent` debe coincidir con ese id de agente cuando
  ambos se suministran. Las claves desnudas no centinela se limitan a `--agent` cuando
  se suministran; por ejemplo, `--agent ops --session-key incident-42` se dirige a
  `agent:ops:incident-42`. Sin `--agent`, las claves desnudas no centinela se limitan
  al agente predeterminado configurado. Los literales `global` y `unknown` permanecen
  sin ámbito solo cuando no se proporciona ningún `--agent`; en ese caso, el respaldo integrado
  y la propiedad de la tienda utilizan el agente predeterminado configurado.
- Las opciones de pensamiento (thinking) y detallado (verbose) persisten en el almacén de la sesión.
- Salida: texto sin formato por defecto, o `--json` para carga estructurada + metadatos.
- Con `--json --deliver`, el JSON incluye el estado de entrega para envíos
  enviados, suprimidos, parciales y fallidos. Vea
  [Estado de entrega JSON](/es/cli/agent#json-delivery-status).

## Ejemplos

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Exact session key
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"

# Legacy key scoped to an agent
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## Relacionado

<CardGroup cols={2}>
  <Card title="Referencia de la CLI de Agent" href="/es/cli/agent" icon="terminal">
    Referencia completa de opciones y banderas de `openclaw agent`.
  </Card>
  <Card title="Subagentes" href="/es/tools/subagents" icon="users">
    Generación de subagentes en segundo plano.
  </Card>
  <Card title="Sesiones" href="/es/concepts/session" icon="comments">
    Cómo funcionan las claves de sesión y cómo `--to``--agent`, %%PH:INLINE_CODE:69:5d8396b%% y `--session-id` las resuelven.
  </Card>
  <Card title="Comandos de barra" href="/es/tools/slash-commands" icon="slash">
    Catálogo de comandos nativos utilizados dentro de las sesiones de agente.
  </Card>
</CardGroup>
