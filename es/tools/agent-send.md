---
summary: "Ejecuciones directas de la CLI de `openclaw agent` (con entrega opcional)"
read_when:
  - Agregar o modificar el punto de entrada de la CLI del agente
title: "Agente Send"
---

# `openclaw agent` (ejecuciones directas del agente)

`openclaw agent` ejecuta un solo turno de agente sin necesidad de un mensaje de chat entrante.
De forma predeterminada, pasa **a través de la Gateway**; agregue `--local` para forzar el
runtime integrado en la máquina actual.

## Comportamiento

- Obligatorio: `--message <text>`
- Selección de sesión:
  - `--to <dest>` deriva la clave de sesión (los objetivos de grupo/canal preservan el aislamiento; los chats directos colapsan en `main`), **o**
  - `--session-id <id>` reutiliza una sesión existente por id, **o**
  - `--agent <id>` apunta a un agente configurado directamente (usa la clave de sesión `main` de ese agente)
- Ejecuta el mismo tiempo de ejecución de agente integrado que las respuestas entrantes normales.
- Las marcas de pensamiento/detallado persisten en el almacén de sesiones.
- Salida:
  - predeterminado: imprime el texto de respuesta (más líneas `MEDIA:<url>`)
  - `--json`: imprime la carga estructurada + metadatos
- Entrega opcional de vuelta a un canal con `--deliver` + `--channel` (los formatos de destino coinciden con `openclaw message --target`).
- Use `--reply-channel`/`--reply-to`/`--reply-account` para anular la entrega sin cambiar la sesión.

Si la Gateway es inalcanzable, la CLI **retrocede** a la ejecución local integrada.

## Ejemplos

```bash
openclaw agent --to +15555550123 --message "status update"
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --to +15555550123 --message "Summon reply" --deliver
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## Marcas

- `--local`: ejecutar localmente (requiere claves API del proveedor de modelos en su shell)
- `--deliver`: envía la respuesta al canal elegido
- `--channel`: canal de entrega (`whatsapp|telegram|discord|googlechat|slack|signal|imessage`, predeterminado: `whatsapp`)
- `--reply-to`: anulación del destino de entrega
- `--reply-channel`: anulación del canal de entrega
- `--reply-account`: anulación del id de cuenta de entrega
- `--thinking <off|minimal|low|medium|high|xhigh>`: persistir el nivel de pensamiento (solo modelos GPT-5.2 + Codex)
- `--verbose <on|full|off>`: persistir el nivel detallado
- `--timeout <seconds>`: anular el tiempo de espera del agente
- `--json`: salida JSON estructurada

import en from "/components/footer/en.mdx";

<en />
