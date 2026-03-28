---
summary: "Modo de ejecución elevado: ejecuta comandos en el host de puerta de enlace desde un agente en sandbox"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "Modo Elevado"
---

# Modo Elevado

Cuando un agente se ejecuta dentro de un sandbox, sus comandos `exec` están confinados al
entorno del sandbox. El **Modo elevado** permite al agente salir y ejecutar comandos
en el host de la puerta de enlace en su lugar, con puertas de aprobación configurables.

<Info>El modo elevado solo cambia el comportamiento cuando el agente está **en sandbox**. Para los agentes sin sandbox, exec ya se ejecuta en el host.</Info>

## Directivas

Controle el modo elevado por sesión con comandos de barra:

| Directiva        | Lo que hace                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `/elevated on`   | Ejecutar en el host de la puerta de enlace, mantener aprobaciones de exec    |
| `/elevated ask`  | Igual que `on` (alias)                                                       |
| `/elevated full` | Ejecutar en el host de la puerta de enlace **y** omitir aprobaciones de exec |
| `/elevated off`  | Volver a la ejecución confinada al sandbox                                   |

También disponible como `/elev on|off|ask|full`.

Envíe `/elevated` sin argumentos para ver el nivel actual.

## Cómo funciona

<Steps>
  <Step title="Verificar disponibilidad">
    Elevated debe estar habilitado en la configuración y el remitente debe estar en la lista de permitidos:

    ```json5
    {
      tools: {
        elevated: {
          enabled: true,
          allowFrom: {
            discord: ["user-id-123"],
            whatsapp: ["+15555550123"],
          },
        },
      },
    }
    ```

  </Step>

  <Step title="Establecer el nivel">
    Envíe un mensaje de solo directiva para establecer el valor predeterminado de la sesión:

    ```
    /elevated full
    ```

    O úselo en línea (se aplica solo a ese mensaje):

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="Los comandos se ejecutan en el host">
    Con elevated activo, las llamadas a `exec` se dirigen al host de la puerta de enlace en lugar del
    sandbox. En el modo `full`, se omiten las aprobaciones de exec. En el modo `on`/`ask`,
    las reglas de aprobación configuradas aún se aplican.
  </Step>
</Steps>

## Orden de resolución

1. **Directiva en línea** en el mensaje (se aplica solo a ese mensaje)
2. **Anulación de sesión** (establecida al enviar un mensaje de solo directiva)
3. **Valor predeterminado global** (`agents.defaults.elevatedDefault` en configuración)

## Disponibilidad y listas de permitidos

- **Global gate**: `tools.elevated.enabled` (must be `true`)
- **Sender allowlist**: `tools.elevated.allowFrom` con listas por canal
- **Per-agent gate**: `agents.list[].tools.elevated.enabled` (solo puede restringir más)
- **Per-agent allowlist**: `agents.list[].tools.elevated.allowFrom` (el remitente debe coincidir con la global + por agente)
- **Discord fallback**: si se omite `tools.elevated.allowFrom.discord`, se usa `channels.discord.allowFrom` como alternativa
- **All gates must pass**; de lo contrario, elevated se trata como no disponible

Allowlist entry formats:

| Prefix                  | Matches                           |
| ----------------------- | --------------------------------- |
| (ninguno)               | Sender ID, E.164 o campo From     |
| `name:`                 | Nombre para mostrar del remitente |
| `username:`             | Nombre de usuario del remitente   |
| `tag:`                  | Etiqueta del remitente            |
| `id:`, `from:`, `e164:` | Targeting de identidad explícita  |

## What elevated does not control

- **Tool policy**: si `exec` es denegado por la política de herramientas, elevated no puede anularlo
- **Separate from `/exec`**: la directiva `/exec` ajusta los valores predeterminados de exec por sesión para remitentes autorizados y no requiere el modo elevated

## Related

- [Exec tool](/es/tools/exec) — ejecución de comandos de shell
- [Exec approvals](/es/tools/exec-approvals) — sistema de aprobación y lista de permitidos
- [Sandboxing](/es/gateway/sandboxing) — configuración de sandbox
- [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated)
