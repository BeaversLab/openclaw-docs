---
summary: "Modo de ejecución elevado: ejecutar comandos fuera del entorno limitado desde un agente en entorno limitado"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "Modo Elevado"
---

# Modo Elevado

Cuando un agente se ejecuta dentro de un entorno limitado (sandbox), sus comandos `exec` se limitan al entorno del sandbox. El **Modo elevado** permite al agente salirse y ejecutar comandos fuera del sandbox, con puertas de aprobación configurables.

<Info>El modo elevado solo cambia el comportamiento cuando el agente está **en sandbox**. Para los agentes sin sandbox, exec ya se ejecuta en el host.</Info>

## Directivas

Controle el modo elevado por sesión con comandos de barra:

| Directiva        | Lo que hace                                                                       |
| ---------------- | --------------------------------------------------------------------------------- |
| `/elevated on`   | Ejecutar fuera del sandbox en la ruta del host configurada, mantener aprobaciones |
| `/elevated ask`  | Igual que `on` (alias)                                                            |
| `/elevated full` | Ejecutar fuera del sandbox en la ruta del host configurada y omitir aprobaciones  |
| `/elevated off`  | Volver a la ejecución confinada al sandbox                                        |

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

  <Step title="Los comandos se ejecutan fuera del sandbox">
    Con el modo elevado activo, las llamadas a `exec` salen del sandbox. El host efectivo es
    `gateway` por defecto, o `node` cuando el destino de ejecución configurado/sesión es
    `node`. En modo `full`, se omiten las aprobaciones de ejecución. En modo `on`/`ask`,
    las reglas de aprobación configuradas aún se aplican.
  </Step>
</Steps>

## Orden de resolución

1. **Directiva en línea** en el mensaje (se aplica solo a ese mensaje)
2. **Anulación de sesión** (establecida al enviar un mensaje de solo directiva)
3. **Valor predeterminado global** (`agents.defaults.elevatedDefault` en la configuración)

## Disponibilidad y listas de permitidos

- **Puerta global**: `tools.elevated.enabled` (debe ser `true`)
- **Lista de permitidos del remitente**: `tools.elevated.allowFrom` con listas por canal
- **Puerta por agente**: `agents.list[].tools.elevated.enabled` (solo puede restringir aún más)
- **Lista de permitidos por agente**: `agents.list[].tools.elevated.allowFrom` (el remitente debe coincidir con global + por agente)
- **Alternativa de Discord**: si se omite `tools.elevated.allowFrom.discord`, se usa `channels.discord.allowFrom` como alternativa
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

- **Política de herramientas**: si `exec` es denegado por la política de herramientas, el modo elevado no puede anularlo
- **Política de selección de host**: el modo elevado no convierte `auto` en una anulación gratuita entre hosts. Utiliza las reglas del destino de ejecución configurado/sesión, eligiendo `node` solo cuando el destino ya es `node`.
- **Separado de `/exec`**: la directiva `/exec` ajusta los valores predeterminados de ejecución por sesión para remitentes autorizados y no requiere el modo elevado

## Relacionado

- [Herramienta Exec](/es/tools/exec) — ejecución de comandos de shell
- [Aprobaciones de Exec](/es/tools/exec-approvals) — sistema de aprobaciones y listas permitidas
- [Sandbox (Caja de arena)](/es/gateway/sandboxing) — configuración del sandbox
- [Sandbox vs Política de herramientas vs Modo elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated)
