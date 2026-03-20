---
title: "Detección de bucles de herramientas"
description: "Configure protecciones opcionales para evitar bucles de llamadas a herramientas repetitivas o bloqueadas"
summary: "Cómo activar y ajustar las protecciones que detectan bucles de llamadas a herramientas repetitivas"
read_when:
  - Un usuario informa que los agentes se quedan atascados repitiendo llamadas a herramientas
  - Necesitas ajustar la protección de llamadas repetitivas
  - Estás editando las políticas de herramientas/tiempo de ejecución del agente
---

# Detección de bucles de herramientas

OpenClaw puede evitar que los agentes se queden atascados en patrones de llamadas a herramientas repetitivas.
La protección está **desactivada por defecto**.

Actívala solo donde sea necesario, ya que puede bloquear llamadas repetitivas legítimas con configuraciones estrictas.

## Por qué existe esto

- Detecta secuencias repetitivas que no progresan.
- Detecta bucles de alta frecuencia sin resultados (misma herramienta, mismas entradas, errores repetidos).
- Detecta patrones de llamadas repetitivos específicos para herramientas de sondeo conocidas.

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

- `enabled`: Interruptor maestro. `false` significa que no se realiza la detección de bucles.
- `historySize`: número de llamadas a herramientas recientes que se guardan para el análisis.
- `warningThreshold`: umbral antes de clasificar un patrón como solo de advertencia.
- `criticalThreshold`: umbral para bloquear patrones de bucles repetitivos.
- `globalCircuitBreakerThreshold`: umbral global del interruptor de sin progreso.
- `detectors.genericRepeat`: detecta patrones repetidos de misma herramienta + mismos parámetros.
- `detectors.knownPollNoProgress`: detecta patrones conocidos de tipo sondeo sin cambio de estado.
- `detectors.pingPong`: detecta patrones de ping-pong alternantes.

## Configuración recomendada

- Empieza con `enabled: true`, valores predeterminados sin cambios.
- Mantén los umbrales ordenados como `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- Si se producen falsos positivos:
  - aumenta `warningThreshold` y/o `criticalThreshold`
  - (opcionalmente) aumenta `globalCircuitBreakerThreshold`
  - desactiva solo el detector que cause problemas
  - reduce `historySize` para un contexto histórico menos estricto

## Registros y comportamiento esperado

Cuando se detecta un bucle, OpenClaw informa de un evento de bucle y bloquea o amortigua el siguiente ciclo de herramientas según la gravedad.
Esto protege a los usuarios de un gasto descontrolado de tokens y de bloqueos, al tiempo que preserva el acceso normal a las herramientas.

- Prefiere primero las advertencias y la supresión temporal.
- Escala solo cuando se acumulen pruebas repetidas.

## Notas

- `tools.loopDetection` se combina con las anulaciones a nivel de agente.
- La configuración por agente anula o extiende completamente los valores globales.
- Si no existe configuración, las salvaguardas permanecen desactivadas.

import en from "/components/footer/en.mdx";

<en />
