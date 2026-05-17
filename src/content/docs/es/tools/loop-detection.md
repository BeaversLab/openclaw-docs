---
summary: "Cómo activar y ajustar las protecciones que detectan bucles de llamadas a herramientas repetitivas"
title: "Detección de bucles de herramientas"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
  - You hit `compaction_loop_persisted` aborts after a context-overflow retry
---

OpenClaw tiene dos protecciones cooperantes para patrones de llamadas a herramientas repetitivas:

1. **Detección de bucles** (`tools.loopDetection.enabled`) — desactivada por defecto. Supervisa el historial continuo de llamadas a herramientas en busca de patrones repetidos y reintentos de herramientas desconocidas.
2. **Protección post-compacción** (`tools.loopDetection.postCompactionGuard`) — activada por defecto a menos que `tools.loopDetection.enabled` sea explícitamente `false`. Se activa después de cada reintento por compactación y aborta la ejecución cuando el agente emite el mismo triple `(tool, args, result)` dentro de la ventana.

Ambas se configuran bajo el mismo bloque `tools.loopDetection`, pero la protección post-compacción se ejecuta siempre que el interruptor maestro no esté explícitamente apagado. Establezca `tools.loopDetection.enabled: false` para silenciar ambas superficies.

## Por qué existe esto

- Detectar secuencias repetitivas que no progresan.
- Detectar bucles de alta frecuencia sin resultados (misma herramienta, mismas entradas, errores repetidos).
- Detectar patrones de llamadas repetidos específicos para herramientas de sondeo conocidas.
- Evitar que los ciclos de desbordamiento de contexto luego compactación y luego el mismo bucle se ejecuten indefinidamente.

## Bloque de configuración

Valores predeterminados globales, con cada campo documentado mostrado:

```json5
{
  tools: {
    loopDetection: {
      enabled: false, // master switch for the rolling-history detectors
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      unknownToolThreshold: 10,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
      postCompactionGuard: {
        windowSize: 3, // armed after compaction-retry; runs unless enabled is explicitly false
      },
    },
  },
}
```

Anulación por agente (opcional):

```json5
{
  agents: {
    list: [
      {
        id: "safe-runner",
        tools: {
          loopDetection: {
            enabled: true,
            warningThreshold: 8,
            criticalThreshold: 16,
          },
        },
      },
    ],
  },
}
```

### Comportamiento del campo

| Campo                            | Predeterminado | Efecto                                                                                                                                                                 |
| -------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                        | `false`        | Interruptor maestro para los detectores de historial continuo. Establecer `false` también desactiva la protección post-compacción.                                     |
| `historySize`                    | `30`           | Número de llamadas a herramientas recientes almacenadas para el análisis.                                                                                              |
| `warningThreshold`               | `10`           | Umbral antes de que un patrón se clasifique como solo de advertencia.                                                                                                  |
| `criticalThreshold`              | `20`           | Umbral para bloquear patrones de bucle repetitivos sin progreso.                                                                                                       |
| `unknownToolThreshold`           | `10`           | Bloquear llamadas repetidas a la misma herramienta no disponible después de esta cantidad de fallos.                                                                   |
| `globalCircuitBreakerThreshold`  | `30`           | Umbral global de interrupción por falta de progreso en todos los detectores.                                                                                           |
| `detectors.genericRepeat`        | `true`         | Avisa sobre patrones repetitivos de misma herramienta + mismos parámetros y bloquea cuando las mismas llamadas también devuelven resultados idénticos.                 |
| `detectors.knownPollNoProgress`  | `true`         | Detecta patrones de sondeo conocidos sin cambios de estado.                                                                                                            |
| `detectors.pingPong`             | `true`         | Detecta patrones alternantes de ping-pong.                                                                                                                             |
| `postCompactionGuard.windowSize` | `3`            | Número de llamadas a herramientas posteriores a la compactación durante las cuales el guardia permanece armado y el conteo de tríos idénticos que aborta la ejecución. |

Para `exec`, las comprobaciones de falta de progreso comparan resultados de comandos estables e ignoran metadatos volátiles del tiempo de ejecución como la duración, el PID, el ID de sesión y el directorio de trabajo. Cuando hay un ID de ejecución disponible, el historial reciente de llamadas a herramientas se evalúa solo dentro de esa ejecución, por lo que los ciclos de latencia programados y las nuevas ejecuciones no heredan conteos de bucle obsoletos de ejecuciones anteriores.

## Configuración recomendada

- Para modelos más pequeños, establezca `enabled: true` y deje los umbrales en sus valores predeterminados. Los modelos insignia rara vez necesitan detección de historial continuo y pueden dejar el interruptor maestro en `false` mientras aún se benefician del guardia posterior a la compactación.
- Mantenga los umbrales ordenados como `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- Si se producen falsos positivos:
  - Aumente `warningThreshold` y/o `criticalThreshold`.
  - Opcionalmente, aumente `globalCircuitBreakerThreshold`.
  - Desactive solo el detector específico que cause problemas (`detectors.<name>: false`).
  - Reduzca `historySize` para un contexto histórico menos estricto.
- Para desactivar todo (incluido el guardia posterior a la compactación), establezca `tools.loopDetection.enabled: false` explícitamente.

## Guardia posterior a la compactación

Cuando el ejecutor completa un reintento de compactación después de un desbordamiento de contexto, activa un guardia de ventana corta que vigila las siguientes llamadas a herramientas. Si el agente emite el mismo trío `(toolName, argsHash, resultHash)` múltiples veces dentro de la ventana, el guardia concluye que la compactación no rompió el bucle y aborta la ejecución con un error `compaction_loop_persisted`.

El guardia está controlado por el indicador maestro `tools.loopDetection.enabled` con un giro: permanece **habilitado cuando el indicador no está establecido o es `true`** y solo se desactiva cuando el indicador es explícitamente `false`. Esto es intencional. El guardia existe para escapar de bucles de compactación que, de otro modo, consumirían tokens ilimitados, por lo que un usuario sin configuración todavía recibe la protección.

```json5
{
  tools: {
    loopDetection: {
      // master switch; set false to disable the guard along with the rolling detectors
      enabled: true,
      postCompactionGuard: {
        windowSize: 3, // default
      },
    },
  },
}
```

- Un `windowSize` más bajo es más estricto (menos intentos antes de abortar).
- Un `windowSize` más alto da al agente más intentos de recuperación.
- El guardia nunca aborta cuando los resultados están cambiando, solo cuando los resultados son idénticos a nivel de bytes en la ventana.
- Es intencionalmente estrecho: se dispara solo en el desenlace inmediato de un reintento de compactación.

<Note>El guardia de postcompactación se ejecuta siempre que el indicador maestro no sea explícitamente `false`, incluso si nunca escribiste un bloque `tools.loopDetection`. Para verificarlo, busca `post-compaction guard armed for N attempts` en el registro de la puerta de enlace inmediatamente después de un evento de compactación.</Note>

## Registros y comportamiento esperado

Cuando se detecta un bucle, OpenClaw informa de un evento de bucle y amortigua o bloquea el siguiente ciclo de herramientas dependiendo de la gravedad. Esto protege a los usuarios de gastos de tokens descontrolados y bloqueos, a la vez que preserva el acceso normal a las herramientas.

- Las advertencias vienen primero.
- La supresión sigue cuando los patrones persisten más allá del umbral de advertencia.
- Los umbrales críticos bloquean el siguiente ciclo de herramientas y muestran una razón clara de detección de bucles en el registro de ejecución.
- El guardia de postcompactación emite errores `compaction_loop_persisted` con el nombre de la herramienta ofensiva y el recuento de llamadas idénticas.

## Relacionado

<CardGroup cols={2}>
  <Card title="Aprobaciones de ejecución" href="/es/tools/exec-approvals" icon="shield">
    Política de permitir/denegar para la ejecución de shell.
  </Card>
  <Card title="Niveles de pensamiento" href="/es/tools/thinking" icon="brain">
    Niveles de esfuerzo de razonamiento e interacción con la política del proveedor.
  </Card>
  <Card title="Sub-agentes" href="/es/tools/subagents" icon="usuarios">
    Generar agentes aislados para limitar el comportamiento descontrolado.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="engranaje">
    Esquema completo de `tools.loopDetection` y semántica de combinación.
  </Card>
</CardGroup>
