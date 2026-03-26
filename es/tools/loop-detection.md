---
title: "Detección de bucles de herramientas"
summary: "Cómo activar y ajustar las barreras de protección que detectan bucles repetitivos de llamadas a herramientas"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

# Detección de bucles de herramientas

OpenClaw puede evitar que los agentes se queden atrapados en patrones repetitivos de llamadas a herramientas.
El protector está **desactivado por defecto**.

Actívelo solo donde sea necesario, ya que puede bloquear llamadas repetitivas legítimas con configuraciones estrictas.

## Por qué existe esto

- Detectar secuencias repetitivas que no avanzan.
- Detectar bucles de alta frecuencia sin resultados (misma herramienta, mismas entradas, errores repetidos).
- Detectar patrones específicos de llamadas repetidas para herramientas de sondeo conocidas.

## Bloque de configuración

Valores predeterminados globales:

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

Invalidación por agente (opcional):

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

- `enabled`: Interruptor maestro. `false` significa que no se realiza ninguna detección de bucle.
- `historySize`: número de llamadas recientes a herramientas mantenidas para el análisis.
- `warningThreshold`: umbral antes de clasificar un patrón como solo de advertencia.
- `criticalThreshold`: umbral para bloquear patrones de bucle repetitivos.
- `globalCircuitBreakerThreshold`: umbral global del interruptor de sin progreso.
- `detectors.genericRepeat`: detecta patrones repetitivos de misma herramienta + mismos parámetros.
- `detectors.knownPollNoProgress`: detecta patrones conocidos de tipo sondeo sin cambio de estado.
- `detectors.pingPong`: detecta patrones de ping-pong alternantes.

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

- `tools.loopDetection` se combina con las invalidaciones a nivel de agente.
- La configuración por agente anula o amplía completamente los valores globales.
- Si no existe configuración, las protecciones permanecen desactivadas.

import es from "/components/footer/es.mdx";

<es />
