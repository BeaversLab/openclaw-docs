---
summary: "Qué significan las banderas experimentales en OpenClaw y cuáles están documentadas actualmente"
title: "Características experimentales"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

Las características experimentales en OpenClaw son **superficies de vista previa opcionales**. Están
detrás de marcas explícitas porque aún necesitan kilometraje en el mundo real antes de que
merezcan un valor predeterminado estable o un contrato público de larga duración.

Trátalas de manera diferente a la configuración normal:

- Mantenlas **desactivadas por defecto** a menos que la documentación relacionada te indique probar una.
- Espera que la **forma y el comportamiento cambien** más rápido que en la configuración estable.
- Prefiere la ruta estable primero cuando ya exista una.
- Si estás implementando OpenClaw ampliamente, prueba las marcas experimentales en un entorno
  más pequeño antes de integrarlas en una línea base compartida.

## Marcas actualmente documentadas

| Superficie                                | Clave                                                                                      | Úsala cuando                                                                                                                                                                  | Más                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tiempo de ejecución del modelo local      | `agents.defaults.experimental.localModelLean`, `agents.list[].experimental.localModelLean` | Un backend local más pequeño o más estricto se bloquea con la superficie de herramientas predeterminada completa de OpenClaw                                                  | [Modelos locales](/es/gateway/local-models)                                                              |
| Búsqueda de memoria                       | `agents.defaults.memorySearch.experimental.sessionMemory`                                  | Desea que `memory_search` indexe las transcripciones de sesiones anteriores y acepte el costo adicional de almacenamiento/indexación                                          | [Referencia de configuración de memoria](/es/reference/memory-config#session-memory-search-experimental) |
| Herramienta de planificación estructurada | `tools.experimental.planTool`                                                              | Desea que la herramienta estructurada `update_plan` esté expuesta para el seguimiento de trabajo de varios pasos en entornos de ejecución e interfaces de usuario compatibles | [Referencia de configuración de Gateway](/es/gateway/config-tools#toolsexperimental)                     |

## Modo ligero del modelo local

`agents.defaults.experimental.localModelLean: true` es una válvula de alivio de presión para configuraciones de modelos locales más débiles. Cuando está activado, OpenClaw elimina tres herramientas predeterminadas — `browser`, `cron` y `message` — de la superficie de herramientas del agente en cada turno. Nada más cambia. Use `agents.list[].experimental.localModelLean` para habilitar o deshabilitar el mismo comportamiento para un agente configurado.

### Por qué estas tres herramientas

Estas tres herramientas tienen las descripciones más grandes y la mayor cantidad de formas de parámetros en el runtime predeterminado de OpenClaw. En un backend compatible con OpenAI de contexto pequeño o más estricto, esa es la diferencia entre:

- Los esquemas de herramientas encajando limpiamente en el prompt frente a abarrotar el historial de la conversación.
- El modelo eligiendo la herramienta correcta frente a emitir llamadas a herramientas malformadas porque hay demasiados esquemas con aspecto similar.
- El adaptador de Chat Completions manteniéndose dentro de los límites de salida estructurada del servidor frente a provocar un 400 en el tamaño de la carga útil de la llamada a la herramienta.

Eliminarlas no reconfigura silenciosamente OpenClaw, simplemente hace que la lista de herramientas sea más corta. El modelo todavía tiene `read`, `write`, `edit`, `exec`, `apply_patch`, búsqueda/recuperación web (cuando está configurado), memoria, y herramientas de sesión/agente disponibles.

### Cuándo activarlo

Active el modo lean cuando ya haya demostrado que el modelo puede comunicarse con el Gateway, pero los turnos completos del agente se comporten incorrectamente. La cadena de señales típica es:

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` tiene éxito.
2. Un turno normal de agente falla con llamadas a herramientas malformadas, indicaciones demasiado grandes o el modelo ignorando sus herramientas.
3. Alternar `localModelLean: true` borra el fallo.

### Cuándo dejarlo desactivado

Si su servidor maneja el tiempo de ejecución predeterminado completo sin problemas, déjelo desactivado. El modo ligero es una solución alternativa, no un valor predeterminado. Existe porque algunas pilas locales necesitan una superficie de herramientas más pequeña para comportarse; los modelos alojados y las configuraciones locales con buenos recursos no.

El modo lean tampoco reemplaza `tools.profile`, `tools.allow`/`tools.deny`, o la válvula de escape `compat.supportsTools: false` del modelo. Si necesita una superficie de herramienta permanentemente más estrecha para un agente específico, prefiera esos controles estables sobre la bandera experimental.

### Activar

```json5
{
  agents: {
    defaults: {
      experimental: {
        localModelLean: true,
      },
    },
  },
}
```

Para un solo agente:

```json5
{
  agents: {
    list: [
      {
        id: "local",
        model: "lmstudio/gemma-4-e4b-it",
        experimental: {
          localModelLean: true,
        },
      },
    ],
  },
}
```

Reinicie el Gateway después de cambiar la bandera, luego confirme la lista de herramientas recortada con:

```bash
openclaw status --deep
```

La salida de estado profundo enumera las herramientas de agente activas; `browser`, `cron` y `message` deben estar ausentes cuando el modo ligero esté activado.

## Experimental no significa oculto

Si una característica es experimental, OpenClaw debe indicarlo claramente en la documentación y en la ruta de configuración. Lo que **no** debe hacer es introducir comportamientos de vista previa en un control predeterminado con apariencia estable y pretender que es normal. Así es como las superficies de configuración se vuelven desordenadas.

## Relacionado

- [Características](/es/concepts/features)
- [Canales de lanzamiento](/es/install/development-channels)
