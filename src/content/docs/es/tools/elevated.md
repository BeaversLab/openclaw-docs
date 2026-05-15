---
summary: "Modo de ejecución elevado: ejecutar comandos fuera del entorno limitado desde un agente en entorno limitado"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "Modo elevado"
---

Cuando un agente se ejecuta dentro de un sandbox, sus comandos `exec` están confinados al
entorno del sandbox. El **modo elevado** permite al agente salirse y ejecutar comandos
fuera del sandbox en su lugar, con puertas de aprobación configurables.

<Info>El modo elevado solo cambia el comportamiento cuando el agente está **en sandbox**. Para los agentes sin sandbox, exec ya se ejecuta en el host.</Info>

## Directivas

Controle el modo elevado por sesión con comandos de barra diagonal:

| Directiva        | Lo que hace                                                                       |
| ---------------- | --------------------------------------------------------------------------------- |
| `/elevated on`   | Ejecutar fuera del sandbox en la ruta del host configurado, mantener aprobaciones |
| `/elevated ask`  | Igual que `on` (alias)                                                            |
| `/elevated full` | Ejecutar fuera del sandbox en la ruta del host configurado y omitir aprobaciones  |
| `/elevated off`  | Volver a la ejecución confinada en el sandbox                                     |

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
    Con elevated activo, las llamadas a `exec` salen del sandbox. El host efectivo es
    `gateway` de manera predeterminada, o `node` cuando el destino de exec configurado/de sesión es
    `node`. En el modo `full`, se omiten las aprobaciones de exec. En el modo `on`/`ask`,
    las reglas de aprobación configuradas aún se aplican.
  </Step>
</Steps>

## Orden de resolución

1. **Directiva en línea** en el mensaje (se aplica solo a ese mensaje)
2. **Anulación de sesión** (establecida al enviar un mensaje de solo directiva)
3. **Predeterminado global** (`agents.defaults.elevatedDefault` en la configuración)

## Disponibilidad y listas de permitidos

- **Puerta global**: `tools.elevated.enabled` (debe ser `true`)
- **Lista de permitidos del remitente**: `tools.elevated.allowFrom` con listas por canal
- **Puerta por agente**: `agents.list[].tools.elevated.enabled` (solo puede restringir más)
- **Lista de permitidos por agente**: `agents.list[].tools.elevated.allowFrom` (el remitente debe coincidir con global + por agente)
- **Alternativa de Discord**: si se omite `tools.elevated.allowFrom.discord`, se usa `channels.discord.allowFrom` como alternativa
- **Todas las puertas deben pasar**; de lo contrario, el modo elevado se trata como no disponible

Formatos de entrada de la lista de permitidos:

| Prefijo                 | Coincidencias                        |
| ----------------------- | ------------------------------------ |
| (ninguno)               | ID del remitente, E.164 o campo From |
| `name:`                 | Nombre para mostrar del remitente    |
| `username:`             | Nombre de usuario del remitente      |
| `tag:`                  | Etiqueta del remitente               |
| `id:`, `from:`, `e164:` | Destino explícito de identidad       |

## Lo que el modo elevado no controla

- **Política de herramientas**: si `exec` es denegado por la política de herramientas, elevated no puede anularlo.
- **Política de selección de host**: elevated no convierte `auto` en una anulación gratuita entre hosts. Utiliza las reglas de destino de exec configuradas/de sesión, eligiendo `node` solo cuando el destino ya es `node`.
- **Separado de `/exec`**: la directiva `/exec` ajusta los valores predeterminados de exec por sesión para remitentes autorizados y no requiere el modo elevated.

<Note>El comando de chat bash (prefijo `!`; alias `/bash`) es una puerta separada que requiere que `tools.elevated` esté habilitado además de su propia marca `tools.bash.enabled`. Deshabilitar elevated también bloquea los comandos de shell `!`.</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Herramienta Exec" href="/es/tools/exec" icon="terminal">
    Ejecución de comandos de shell desde el agente.
  </Card>
  <Card title="Aprobaciones de Exec" href="/es/tools/exec-approvals" icon="shield">
    Sistema de aprobaciones y listas permitidas para `exec`.
  </Card>
  <Card title="Aislamiento (Sandboxing)" href="/es/gateway/sandboxing" icon="box">
    Configuración de aislamiento a nivel de puerta de enlace.
  </Card>
  <Card title="Sandbox vs Política de herramientas vs Elevated" href="/es/gateway/sandbox-vs-tool-policy-vs-elevated" icon="scale-balanced">
    Cómo se componen las tres puertas durante una llamada a una herramienta.
  </Card>
</CardGroup>
