---
summary: "Cómo habilitar y ajustar las barreras de seguridad que detectan bucles de llamadas a herramientas repetitivas"
title: "Detección de bucles de herramientas"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

OpenClaw puede evitar que los agentes se queden atrapados en patrones de llamadas a herramientas repetitivos.
El guardián está **desactivado por defecto**.

Actívelo solo donde sea necesario, ya que con configuraciones estrictas puede bloquear llamadas repetitivas legítimas.

## Por qué esto existe

- Detectar secuencias repetitivas que no progresan.
- Detectar bucles de alta frecuencia sin resultados (misma herramienta, mismas entradas, errores repetidos).
- Detectar patrones de llamadas repetitivas específicos para herramientas de sondeo conocidas.

## Bloque de configuración

Valores globales predeterminados:

```json5
{
  tools: {
    loopDetection: {
      enabled: false,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
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

- `enabled`: Interruptor maestro. `false` significa que no se realiza ninguna detección de bucles.
- `historySize`: número de llamadas a herramientas recientes mantenidas para el análisis.
- `warningThreshold`: umbral antes de clasificar un patrón como solo de advertencia.
- `criticalThreshold`: umbral para bloquear patrones de bucles repetitivos.
- `globalCircuitBreakerThreshold`: umbral global del rompedor de sin progreso.
- `detectors.genericRepeat`: detecta patrones repetidos de misma herramienta + mismos parámetros.
- `detectors.knownPollNoProgress`: detecta patrones conocidos de tipo sondeo sin cambio de estado.
- `detectors.pingPong`: detecta patrones de ping-pong alternantes.

Para `exec`, las comprobaciones de sin progreso comparan resultados estables de comandos e ignoran metadatos volátiles de tiempo de ejecución como la duración, PID, ID de sesión y directorio de trabajo.
Cuando hay un id de ejecución disponible, el historial de llamadas a herramientas recientes se evalúa solo dentro de esa ejecución, por lo que los ciclos de latido programados y las ejecuciones nuevas no heredan conteos de bucles obsoletos de ejecuciones anteriores.

## Configuración recomendada

- Comience con `enabled: true`, valores predeterminados sin cambios.
- Mantenga los umbrales ordenados como `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- Si ocurren falsos positivos:
  - aumente `warningThreshold` y/o `criticalThreshold`
  - (opcionalmente) aumente `globalCircuitBreakerThreshold`
  - desactive solo el detector que cause problemas
  - reduzca `historySize` para un contexto histórico menos estricto

## Registros y comportamiento esperado

Cuando se detecta un bucle, OpenClaw informa de un evento de bucle y bloquea o amortigua el siguiente ciclo de herramientas según la gravedad.
Esto protege a los usuarios contra gastos descontrolados de tokens y bloqueos, preservando al mismo tiempo el acceso normal a las herramientas.

- Prefiera la advertencia y la supresión temporal primero.
- Escale solo cuando se acumule evidencia repetida.

## Notas

- `tools.loopDetection` se fusiona con las anulaciones a nivel de agente.
- La configuración por agente anula o amplía completamente los valores globales.
- Si no existe configuración, las protecciones permanecen desactivadas.

## Relacionado

- [Aprobaciones de ejecución](/es/tools/exec-approvals)
- [Niveles de pensamiento](/es/tools/thinking)
- [Subagentes](/es/tools/subagents)
