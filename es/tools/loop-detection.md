---
title: "Detección de bucles de herramientas"
description: "Configure protecciones opcionales para evitar bucles de llamadas a herramientas repetitivas o bloqueadas"
summary: "Cómo habilitar y ajustar las protecciones que detectan bucles de llamadas a herramientas repetitivas"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

# Detección de bucles de herramientas

OpenClaw puede evitar que los agentes se queden atascados en patrones de llamadas a herramientas repetitivas.
La protección está **deshabilitada de forma predeterminada**.

Habilítela solo donde sea necesario, ya que puede bloquear llamadas repetitivas legítimas con configuraciones estrictas.

## Por qué existe esto

- Detectar secuencias repetitivas que no hacen progresos.
- Detectar bucles de alta frecuencia sin resultados (misma herramienta, mismas entradas, errores repetidos).
- Detectar patrones de llamadas repetitivas específicos para herramientas de sondeo conocidas.

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

- `enabled`: Interruptor maestro. `false` significa que no se realiza ninguna detección de bucles.
- `historySize`: número de llamadas a herramientas recientes mantenidas para su análisis.
- `warningThreshold`: umbral antes de clasificar un patrón como solo de advertencia.
- `criticalThreshold`: umbral para bloquear patrones de bucle repetitivos.
- `globalCircuitBreakerThreshold`: umbral global de interrupción sin progreso.
- `detectors.genericRepeat`: detecta patrones repetitivos de misma herramienta + mismos parámetros.
- `detectors.knownPollNoProgress`: detecta patrones conocidos de tipo sondeo sin cambio de estado.
- `detectors.pingPong`: detecta patrones de ping-pong alternantes.

## Configuración recomendada

- Comience con `enabled: true`, valores predeterminados sin cambios.
- Mantenga los umbrales ordenados como `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- Si se producen falsos positivos:
  - aumente `warningThreshold` y/o `criticalThreshold`
  - (opcionalmente) aumente `globalCircuitBreakerThreshold`
  - deshabilite solo el detector que cause problemas
  - reduzca `historySize` para un contexto histórico menos estricto

## Registros y comportamiento esperado

Cuando se detecta un bucle, OpenClaw informa de un evento de bucle y bloquea o atenúa el siguiente ciclo de herramientas según la gravedad.
Esto protege a los usuarios de un gasto excesivo de tokens y de bloqueos, a la vez que preserva el acceso normal a las herramientas.

- Es preferible dar una advertencia y aplicar una supresión temporal primero.
- Escalad solo cuando se acumulen pruebas repetidas.

## Notas

- `tools.loopDetection` se combina con las anulaciones a nivel de agente.
- La configuración por agente anula o extiende completamente los valores globales.
- Si no existe ninguna configuración, las protecciones permanecen desactivadas.

import es from "/components/footer/es.mdx";

<es />
