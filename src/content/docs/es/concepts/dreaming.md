---
summary: "Consolidación de memoria en segundo plano con fases ligera, profunda y REM, además de un Diario de Sueños"
title: "Sueño"
sidebarTitle: "Sueño"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

Sueño es el sistema de consolidación de memoria en segundo plano en `memory-core`. Ayuda a OpenClaw a mover señales fuertes a corto plazo hacia una memoria duradera, manteniendo el proceso explicable y revisable.

<Note>El Sueño es **opcional** (opt-in) y está deshabilitado de forma predeterminada.</Note>

## Lo que escribe soñar

Soñar mantiene dos tipos de resultados:

- **Estado de la máquina** en `memory/.dreams/` (almacén de recuperación, señales de fase, puntos de control de ingesta, bloqueos).
- **Salida legible por humanos** en `DREAMS.md` (o `dreams.md` existente) y archivos de informe de fase opcionales bajo `memory/dreaming/<phase>/YYYY-MM-DD.md`.

La promoción a largo plazo todavía escribe solo en `MEMORY.md`.

## Modelo de fases

Soñar utiliza tres fases cooperativas:

| Fase     | Propósito                                             | Escritura duradera |
| -------- | ----------------------------------------------------- | ------------------ |
| Ligera   | Clasificar y preparar material a corto plazo reciente | No                 |
| Profunda | Puntuar y promover candidatos duraderos               | Sí (`MEMORY.md`)   |
| REM      | Reflexionar sobre temas e ideas recurrentes           | No                 |

Estas fases son detalles de implementación internos, no "modos" configurados por el usuario por separado.

<AccordionGroup>
  <Accordion title="Fase ligera">
    La fase ligera ingiere señales de memoria diaria reciente y rastros de recuperación, los elimina duplicados y prepara las líneas candidatas.

    - Lee del estado de recuperación a corto plazo, archivos de memoria diaria reciente y transcripciones de sesión redactadas cuando están disponibles.
    - Escribe un bloque `## Light Sleep` gestionado cuando el almacenamiento incluye salida en línea.
    - Registra señales de refuerzo para clasificación profunda posterior.
    - Nunca escribe en `MEMORY.md`.

  </Accordion>
  <Accordion title="Fase profunda">
    La fase profunda decide qué se convierte en memoria a largo plazo.

    - Clasifica a los candidatos utilizando puntuaciones ponderadas y puertas de umbral.
    - Requiere que `minScore`, `minRecallCount` y `minUniqueQueries` pasen.
    - Rehidrata los fragmentos de los archivos diarios en vivo antes de escribir, por lo que los fragmentos obsoletos/eliminados se omiten.
    - Añade las entradas promovidas a `MEMORY.md`.
    - Escribe un resumen `## Deep Sleep` en `DREAMS.md` y opcionalmente escribe `memory/dreaming/deep/YYYY-MM-DD.md`.

  </Accordion>
  <Accordion title="Fase REM">
    La fase REM extrae patrones y señales reflexivas.

    - Construye resúmenes de temas y reflexiones a partir de trazas a corto plazo recientes.
    - Escribe un bloque `## REM Sleep` gestionado cuando el almacenamiento incluye salida en línea.
    - Registra señales de refuerzo REM utilizadas por la clasificación profunda.
    - Nunca escribe en `MEMORY.md`.

  </Accordion>
</AccordionGroup>

## Ingestión de la transcripción de la sesión

Dreaming puede ingerir transcripciones de sesión redactadas en el corpus de dreaming. Cuando las transcripciones están disponibles, se introducen en la fase ligera junto con las señales de memoria diaria y las trazas de recuerdo. El contenido personal y sensible se redacta antes de la ingestión.

## Diario de sueños

Soñar también mantiene un **Diario de Sueños** narrativo en `DREAMS.md`. Después de que cada fase tenga suficiente material, `memory-core` ejecuta un turno de subagente de fondo de mejor esfuerzo y añade una breve entrada de diario. Utiliza el modelo de ejecución predeterminado a menos que se configure `dreaming.model`. Si el modelo configurado no está disponible, el Diario de Sueños se reintenta una vez con el modelo predeterminado de la sesión.

<Note>Este diario es para lectura humana en la interfaz de usuario de Dreams, no una fuente de promoción. Los artefactos de diario/informe generados por Dreaming se excluyen de la promoción a corto plazo. Solo los fragmentos de memoria fundamentados son elegibles para ser promovidos a `MEMORY.md`.</Note>

También existe un carril de relleno histórico fundamentado para el trabajo de revisión y recuperación:

<AccordionGroup>
  <Accordion title="Comandos de relleno retroactivo">
    - `memory rem-harness --path ... --grounded` previsualiza la salida del diario fundamentada a partir de notas `YYYY-MM-DD.md` históricas.
    - `memory rem-backfill --path ...` escribe entradas de diario fundamentadas y reversibles en `DREAMS.md`.
    - `memory rem-backfill --path ... --stage-short-term` prepara candidatos duraderos fundamentados en el mismo almacén de evidencia a corto plazo que la fase profunda normal ya utiliza.
    - `memory rem-backfill --rollback` y `--rollback-short-term` eliminan esos artefactos de relleno retroactivo preparados sin tocar las entradas de diario ordinarias ni la recuperación a corto plazo en vivo.

  </Accordion>
</AccordionGroup>

La Interfaz de Usuario de Control expone el mismo flujo de relleno/restablecimiento del diario para que puedas inspeccionar los resultados en la escena Dreams antes de decidir si los candidatos fundamentados merecen ser promovidos. La Escena también muestra un carril fundamentado distinto para que puedas ver qué entradas a corto plazo ensayadas provinieron de la repetición histórica, qué elementos promovidos fueron dirigidos por fundamentación, y borrar solo las entradas ensayadas exclusivamente fundamentadas sin tocar el estado ordinario a corto plazo en vivo.

## Señales de clasificación profunda

La clasificación profunda utiliza seis señales base ponderadas más el refuerzo de fase:

| Señal                   | Peso | Descripción                                           |
| ----------------------- | ---- | ----------------------------------------------------- |
| Frecuencia              | 0.24 | Cuántas señales a corto plazo acumuló la entrada      |
| Relevancia              | 0.30 | Calidad promedio de recuperación para la entrada      |
| Diversidad de consultas | 0.15 | Contextos distintos de consulta/día que la mostraron  |
| Recencia                | 0.15 | Puntuación de frescura con decaimiento temporal       |
| Consolidación           | 0.10 | Fuerza de recurrencia multidiaria                     |
| Riqueza conceptual      | 0.06 | Densidad de etiquetas conceptuales del fragmento/ruta |

Los aciertos de las fases ligera y REM añaden un pequeño impulso con decaimiento por recencia de `memory/.dreams/phase-signals.json`.

## Cobertura del informe de prueba simulada de QA

QA Lab incluye un escenario de solo informe para explorar cómo una futura
prueba simulada de "dreaming" podría revisar una memoria candidata antes de su promoción. El escenario pide
a un agente que compare una respuesta base con una respuesta que puede usar la memoria
candidata, y luego que escriba un informe local con un veredicto, una razón y marcas de riesgo.

Esta cobertura está delimitada intencionalmente a QA. Verifica que el artefacto del informe
permanezca separado de `MEMORY.md` y que el agente no afirme que la candidata
fue promovida. No añade un comportamiento de prueba simulada en producción ni cambia el
motor de promoción de fase profunda.

## Programación

Cuando está habilitado, `memory-core` gestiona automáticamente un trabajo cron para un barrido completo de "dreaming". Cada barrido ejecuta las fases en orden: ligera → REM → profunda.

El barrido incluye el espacio de trabajo de ejecución principal y cualquier espacio de trabajo de agente configurado, deduplicado por ruta, por lo que la expansión del espacio de trabajo del subagente no excluye el `DREAMS.md` ni el estado de la memoria del agente principal.

Comportamiento de cadencia predeterminado:

| Configuración        | Predeterminado        |
| -------------------- | --------------------- |
| `dreaming.frequency` | `0 3 * * *`           |
| `dreaming.model`     | modelo predeterminado |

## Inicio rápido

<Tabs>
  <Tab title="Habilitar dreaming">
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
  </Tab>
  <Tab title="Cadencia de barrido personalizada">
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
  </Tab>
</Tabs>

## Comando de barra

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## Flujo de trabajo de CLI

<Tabs>
  <Tab title="Vista previa / Aplicación de promoción">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    El `memory promote` manual usa umbrales de fase profunda de forma predeterminada a menos que se anule con indicadores de CLI.

  </Tab>
  <Tab title="Explicar promoción">
    Explique por qué una candidata específica se promocionaría o no:

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab title="Vista previa del arnés REM">
    Vista previa de reflexiones REM, verdades de candidatos y salida de promoción profunda sin escribir nada:

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## Valores predeterminados clave

Todas las configuraciones viven bajo `plugins.entries.memory-core.config.dreaming`.

<ParamField path="enabled" type="boolean" default="false">
  Habilita o deshabilita el barrido de sueño (dreaming sweep).
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  Cadencia de Cron para el barrido de sueño completo.
</ParamField>
<ParamField path="model" type="string">
  Sobrescritura opcional del modelo del subagente Dream Diary. Utilice un valor canónico de `provider/model` cuando también se establezca una lista de permitidos (allowlist) del subagente `allowedModels`.
</ParamField>

<Warning>`dreaming.model` requiere `plugins.entries.memory-core.subagent.allowModelOverride: true`. Para restringirlo, también configure `plugins.entries.memory-core.subagent.allowedModels`. Los fallos de confianza o de lista de permitidos permanecen visibles en lugar de recurrir silenciosamente; el reintento solo cubre errores de modelo no disponible.</Warning>

<Note>La política de fases, los umbrales y el comportamiento de almacenamiento son detalles de implementación internos (no configuración para el usuario). Consulte [Referencia de configuración de memoria](/es/reference/memory-config#dreaming) para obtener la lista completa de claves.</Note>

## Interfaz de usuario de Dreams (Dreams UI)

Cuando está habilitado, la pestaña **Dreams** del Gateway muestra:

- estado actual de habilitación del sueño (dreaming)
- estado a nivel de fase y presencia del barrido administrado
- recuentos a corto plazo, grounded (anclado), de señal y promocionados hoy
- momento de la próxima ejecución programada
- un carril (lane) de Escena (Scene) anclado (grounded) distinto para entradas de reproducción histórica preparadas
- un lector de Dream Diary ampliable respaldado por `doctor.memory.dreamDiary`

## El proceso de sueño nunca se ejecuta: el estado muestra bloqueado

Si `openclaw memory status` informa `Dreaming status: blocked`, el cron administrado existe pero el latido del agente predeterminado no se está activando. Compruebe que el latido esté habilitado para el agente predeterminado y que su objetivo no sea `none`, luego ejecute `openclaw memory status --deep` nuevamente después del siguiente intervalo de latido.

## Relacionado

- [Memoria](/es/concepts/memory)
- [CLI de Memoria](/es/cli/memory)
- [Referencia de configuración de memoria](/es/reference/memory-config)
- [Búsqueda de memoria](/es/concepts/memory-search)
