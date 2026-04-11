---
title: "Soñar (experimental)"
summary: "Consolidación de memoria en segundo plano con fases ligera, profunda y REM, además de un Diario de Sueños"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

# Soñar (experimental)

Soñar es el sistema de consolidación de memoria en segundo plano en `memory-core`.
Ayuda a OpenClaw a mover señales fuertes a corto plazo hacia la memoria duradera mientras
mantiene el proceso explicable y revisable.

Soñar es **opcional** y está deshabilitado por defecto.

## Lo que escribe soñar

Soñar mantiene dos tipos de resultados:

- **Estado de la máquina** en `memory/.dreams/` (almacén de recuerdos, señales de fase, puntos de control de ingesta, bloqueos).
- **Salida legible por humanos** en `DREAMS.md` (o el `dreams.md` existente) y archivos de informe de fase opcionales bajo `memory/dreaming/<phase>/YYYY-MM-DD.md`.

La promoción a largo plazo todavía solo escribe en `MEMORY.md`.

## Modelo de fases

Soñar utiliza tres fases cooperativas:

| Fase     | Propósito                                             | Escritura duradera |
| -------- | ----------------------------------------------------- | ------------------ |
| Ligera   | Clasificar y preparar material a corto plazo reciente | No                 |
| Profunda | Puntuar y promover candidatos duraderos               | Sí (`MEMORY.md`)   |
| REM      | Reflexionar sobre temas e ideas recurrentes           | No                 |

Estas fases son detalles de implementación internos, no "modos"
separados configurados por el usuario.

### Fase ligera

La fase ligera ingiere señales de memoria diaria reciente y rastros de recuerdo, los deduplica,
y prepara líneas candidatas.

- Lee desde el estado de recuerdo a corto plazo y archivos de memoria diaria recientes.
- Escribe un bloque `## Light Sleep` gestionado cuando el almacenamiento incluye salida en línea.
- Registra señales de refuerzo para la clasificación profunda posterior.
- Nunca escribe en `MEMORY.md`.

### Fase profunda

La fase profunda decide qué se convierte en memoria a largo plazo.

- Clasifica a los candidatos utilizando puntuación ponderada y puertas de umbral.
- Requiere que `minScore`, `minRecallCount` y `minUniqueQueries` se aprueben.
- Rehidrata fragmentos de archivos diarios en vivo antes de escribir, por lo que los fragmentos obsoletos/eliminados se omiten.
- Agrega las entradas promocionadas a `MEMORY.md`.
- Escribe un resumen `## Deep Sleep` en `DREAMS.md` y opcionalmente escribe `memory/dreaming/deep/YYYY-MM-DD.md`.

### Fase REM

La fase REM extrae patrones y señales reflexivas.

- Construye resúmenes de temas y reflexiones a partir de rastros a corto plazo recientes.
- Escribe un bloque `## REM Sleep` gestionado cuando el almacenamiento incluye salida en línea.
- Registra señales de refuerzo REM utilizadas por la clasificación profunda.
- Nunca escribe en `MEMORY.md`.

## Diario de sueños

Soñar también mantiene un **Diario de Sueños** narrativo en `DREAMS.md`.
Después de que cada fase tenga suficiente material, `memory-core` ejecuta un turno de mejor esfuerzo
en segundo plano del subagente (usando el modelo de tiempo de ejecución predeterminado) y agrega una breve entrada de diario.

Este diario es para lectura humana en la interfaz de Dreams (Sueños), no una fuente de promoción.

## Señales de clasificación profunda

La clasificación profunda utiliza seis señales base ponderadas más el refuerzo de fases:

| Señal                   | Peso | Descripción                                          |
| ----------------------- | ---- | ---------------------------------------------------- |
| Frecuencia              | 0.24 | Cuántas señales a corto plazo acumuló la entrada     |
| Relevancia              | 0.30 | Calidad promedio de recuperación para la entrada     |
| Diversidad de consultas | 0.15 | Contextos de consulta/día distintos que la mostraron |
| Recencia                | 0.15 | Puntuación de frescura con decaimiento temporal      |
| Consolidación           | 0.10 | Fuerza de recurrencia multiperíodo                   |
| Riqueza conceptual      | 0.06 | Densidad de etiquetas de concepto del fragmento/ruta |

Los aciertos de las fases Ligera y REM añaden un pequeño impulso de decadencia reciente de
`memory/.dreams/phase-signals.json`.

## Programación

Cuando está habilitado, `memory-core` gestiona automáticamente un trabajo cron para una barrida completa
de sueño. Cada barrida ejecuta las fases en orden: ligera -> REM -> profunda.

Comportamiento de cadencia predeterminado:

| Configuración        | Predeterminado |
| -------------------- | -------------- |
| `dreaming.frequency` | `0 3 * * *`    |

## Inicio rápido

Habilitar el soñador:

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

Habilitar el soñador con una cadencia de barrido personalizada:

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "timezone": "America/Los_Angeles",
            "frequency": "0 */6 * * *"
          }
        }
      }
    }
  }
}
```

## Comando de barra

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## Flujo de trabajo CLI

Use la promoción CLI para previsualizar o aplicar manualmente:

```bash
openclaw memory promote
openclaw memory promote --apply
openclaw memory promote --limit 5
openclaw memory status --deep
```

El `memory promote` manual utiliza los umbrales de la fase profunda de forma predeterminada a menos que se anulen
con indicadores de CLI.

Explique por qué un candidato específico promocionaría o no promocionaría:

```bash
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
```

Vista previa de reflexiones REM, verdades candidatas y salida de promoción profunda sin
escribir nada:

```bash
openclaw memory rem-harness
openclaw memory rem-harness --json
```

## Valores predeterminados clave

Todas las configuraciones se encuentran en `plugins.entries.memory-core.config.dreaming`.

| Clave       | Predeterminado |
| ----------- | -------------- |
| `enabled`   | `false`        |
| `frequency` | `0 3 * * *`    |

La política de fases, los umbrales y el comportamiento de almacenamiento son detalles internos de la implementación
(no configuración orientada al usuario).

Vea [Referencia de configuración de memoria](/en/reference/memory-config#dreaming-experimental)
para la lista completa de claves.

## Interfaz de usuario de Dreams

Cuando está habilitado, la pestaña **Dreams** de Gateway muestra:

- estado actual de habilitación de dreaming
- estado a nivel de fase y presencia de barrido gestionado
- recuentos a corto plazo, a largo plazo y promovidos hoy
- momento de la próxima ejecución programada
- un lector ampliable del Diario de Sueños respaldado por `doctor.memory.dreamDiary`

## Relacionado

- [Memoria](/en/concepts/memory)
- [Búsqueda de memoria](/en/concepts/memory-search)
- [CLI de memoria](/en/cli/memory)
- [Referencia de configuración de memoria](/en/reference/memory-config)
