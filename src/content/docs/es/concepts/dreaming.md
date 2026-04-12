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

- Lee del estado de recuperación a corto plazo, archivos de memoria diaria recientes y transcripciones de sesión redactadas cuando están disponibles.
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

## Ingestión de transcripciones de sesión

Soñar puede ingerir transcripciones de sesión redactadas en el corpus de sueños. Cuando
las transcripciones están disponibles, se introducen en la fase ligera junto con las
señales de memoria diaria y los rastros de recuperación. El contenido personal y sensible se redacta
antes de la ingestión.

## Diario de sueños

Soñar también mantiene un **Diario de sueños** narrativo en `DREAMS.md`.
Después de que cada fase tenga suficiente material, `memory-core` ejecuta un turno de
subagente de fondo de mejor esfuerzo (usando el modelo de tiempo de ejecución predeterminado) y añade una breve entrada de diario.

Este diario es para lectura humana en la interfaz de usuario de Dreams, no una fuente de promoción.

También hay un carril de relleno histórico fundamentado para trabajos de revisión y recuperación:

- `memory rem-harness --path ... --grounded` previsualiza la salida del diario fundamentado a partir de notas históricas `YYYY-MM-DD.md`.
- `memory rem-backfill --path ...` escribe entradas de diario fundamentadas reversibles en `DREAMS.md`.
- `memory rem-backfill --path ... --stage-short-term` pone en escena candidatos duraderos fundamentados en el mismo almacén de evidencia a corto plazo que la fase profunda normal ya usa.
- `memory rem-backfill --rollback` y `--rollback-short-term` eliminan esos artefactos de relleno puestos en escena sin tocar las entradas de diario ordinarias ni la recuperación a corto plazo en vivo.

La interfaz de usuario de Control expone el mismo flujo de relleno/restablecimiento de diario para que puedas inspeccionar
los resultados en la escena Dreams antes de decidir si los candidatos fundamentados
merecen promoción. La escena también muestra un carril fundamentado distinto para que puedas ver
qué entradas a corto plazo puestas en escena provinieron de la reproducción histórica, qué elementos promovidos
fueron dirigidos por fundamentación, y borrar solo las entradas puestas en escena exclusivamente fundamentadas sin
tocar el estado a corto plazo ordinario en vivo.

## Señales de clasificación profunda

La clasificación profunda utiliza seis señales base ponderadas más el refuerzo de fase:

| Señal                   | Peso | Descripción                                            |
| ----------------------- | ---- | ------------------------------------------------------ |
| Frecuencia              | 0.24 | Cuántas señales a corto plazo acumuló la entrada       |
| Relevancia              | 0.30 | Calidad promedio de recuperación para la entrada       |
| Diversidad de consultas | 0.15 | Contextos distintos de consulta/día que la mostraron   |
| Recencia                | 0.15 | Puntuación de frescura con decaimiento temporal        |
| Consolidación           | 0.10 | Fuerza de recurrencia de varios días                   |
| Riqueza conceptual      | 0.06 | Densidad de etiquetas de concepto desde fragmento/ruta |

Los aciertos de las fases Ligera y REM añaden un pequeño impulso de desvanecimiento por reciente desde
`memory/.dreams/phase-signals.json`.

## Programación

Cuando está habilitado, `memory-core` gestiona automáticamente un trabajo cron para un barrido completo de
dreaming. Cada barrido ejecuta las fases en orden: ligera -> REM -> profunda.

Comportamiento de cadencia predeterminado:

| Ajuste               | Predeterminado |
| -------------------- | -------------- |
| `dreaming.frequency` | `0 3 * * *`    |

## Inicio rápido

Habilitar dreaming:

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

Habilitar dreaming con una cadencia de barrido personalizada:

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

## Flujo de trabajo de CLI

Use la promoción desde CLI para vista previa o aplicación manual:

```bash
openclaw memory promote
openclaw memory promote --apply
openclaw memory promote --limit 5
openclaw memory status --deep
```

El `memory promote` manual utiliza los umbrales de la fase profunda de forma predeterminada a menos que se anulen
con banderas de CLI.

Explique por qué un candidato específico promovería o no:

```bash
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
```

Vista previa de reflexiones REM, verdades de candidatos y salida de promoción profunda sin
escribir nada:

```bash
openclaw memory rem-harness
openclaw memory rem-harness --json
```

## Valores clave predeterminados

Todos los ajustes se encuentran bajo `plugins.entries.memory-core.config.dreaming`.

| Clave       | Predeterminado |
| ----------- | -------------- |
| `enabled`   | `false`        |
| `frequency` | `0 3 * * *`    |

La política de fase, los umbrales y el comportamiento de almacenamiento son detalles internos de
implementación (no configuración visible para el usuario).

Consulte [Referencia de configuración de memoria](/en/reference/memory-config#dreaming-experimental)
para obtener la lista completa de claves.

## Interfaz de usuario de Dreams

Cuando está habilitado, la pestaña **Dreams** del Gateway muestra:

- estado de habilitación de dreaming actual
- estado a nivel de fase y presencia de barrido gestionado
- recuentos de corto plazo, anclados, señal y promovidos hoy
- momento de la próxima ejecución programada
- un carril de Escena anclado distintivo para entradas de repetición histórica preparadas
- un lector expandible del Diario de Sueños respaldado por `doctor.memory.dreamDiary`

## Relacionado

- [Memoria](/en/concepts/memory)
- [Búsqueda de memoria](/en/concepts/memory-search)
- [CLI de memoria](/en/cli/memory)
- [Referencia de configuración de memoria](/en/reference/memory-config)
