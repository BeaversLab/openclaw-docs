---
title: "Soñar (experimental)"
summary: "Consolidación de memoria en segundo plano con fases ligera, profunda y REM más un diario de sueños"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

# Soñar (experimental)

Soñar es el sistema de consolidación de memoria en segundo plano en `memory-core`.
Ayuda a OpenClaw a mover señales a corto plazo fuertes hacia una memoria duradera mientras
mantiene el proceso explicable y revisable.

Soñar es **opcional** y está deshabilitado por defecto.

## Lo que escribe soñar

Soñar mantiene dos tipos de resultados:

- **Estado de la máquina** en `memory/.dreams/` (almacén de recuperación, señales de fase, puntos de control de ingesta, bloqueos).
- **Salida legible por humanos** en `DREAMS.md` (o `dreams.md` existente) y archivos de informes de fase opcionales bajo `memory/dreaming/<phase>/YYYY-MM-DD.md`.

La promoción a largo plazo todavía escribe solo en `MEMORY.md`.

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
- Requiere que `minScore`, `minRecallCount` y `minUniqueQueries` pasen.
- Rehidrata fragmentos de archivos diarios en vivo antes de escribir, por lo que los fragmentos obsoletos/eliminados se omiten.
- Agrega las entradas promovidas a `MEMORY.md`.
- Escribe un resumen `## Deep Sleep` en `DREAMS.md` y opcionalmente escribe `memory/dreaming/deep/YYYY-MM-DD.md`.

### Fase REM

La fase REM extrae patrones y señales reflexivas.

- Construye resúmenes de temas y reflexiones a partir de rastros a corto plazo recientes.
- Escribe un bloque `## REM Sleep` gestionado cuando el almacenamiento incluye salida en línea.
- Registra señales de refuerzo REM utilizadas por la clasificación profunda.
- Nunca escribe en `MEMORY.md`.

## Diario de sueños

Soñar también mantiene un **Diario de sueños** narrativo en `DREAMS.md`.
Después de que cada fase tenga suficiente material, `memory-core` ejecuta un turno de subagente
de fondo de mejor esfuerzo (usando el modelo de tiempo de ejecución predeterminado) y añade una breve entrada de diario.

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

Los aciertos de las fases Light y REM añaden un pequeño impulso con decaimiento de recencia de
`memory/.dreams/phase-signals.json`.

## Programación

Cuando está habilitado, `memory-core` gestiona automáticamente un trabajo cron para un barrido
de sueño completo. Cada barrido ejecuta las fases en orden: light -> REM -> deep.

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

El `memory promote` manual utiliza umbrales de fase profunda de forma predeterminada a menos que se anulen
con banderas CLI.

## Valores predeterminados clave

Todas las configuraciones se encuentran en `plugins.entries.memory-core.config.dreaming`.

| Clave       | Predeterminado |
| ----------- | -------------- |
| `enabled`   | `false`        |
| `frequency` | `0 3 * * *`    |

La política de fases, los umbrales y el comportamiento de almacenamiento son detalles internos de implementación
(no configuración orientada al usuario).

Consulte [Referencia de configuración de memoria](/en/reference/memory-config#dreaming-experimental)
para obtener la lista completa de claves.

## Interfaz de Dreams

Cuando está habilitado, la pestaña **Sueños** de Gateway muestra:

- estado actual de habilitación de dreaming
- estado a nivel de fase y presencia de barridos gestionados
- recuentos a corto plazo, largo plazo y promovidos hoy
- momento de la próxima ejecución programada
- un lector expandible del Diario de Sueños respaldado por `doctor.memory.dreamDiary`

## Relacionado

- [Memoria](/en/concepts/memory)
- [Búsqueda de memoria](/en/concepts/memory-search)
- [CLI de memoria](/en/cli/memory)
- [Referencia de configuración de memoria](/en/reference/memory-config)
