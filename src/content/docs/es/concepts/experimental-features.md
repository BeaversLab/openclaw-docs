---
title: "Funciones experimentales"
summary: "Qué significan los indicadores experimentales en OpenClaw y cuáles están actualmente documentados"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

# Funciones experimentales

Las funciones experimentales en OpenClaw son **superficies de vista previa de participación voluntaria**. Están detrás de indicadores explícitos porque aún necesitan experiencia en el mundo real antes de merecer un valor predeterminado estable o un contrato público duradero.

Trátelas de manera diferente a la configuración normal:

- Manténgalas **desactivadas por defecto** a menos que la documentación relacionada indique que debe probar una.
- Espere que **su forma y comportamiento cambien** más rápido que la configuración estable.
- Prefiera primero el camino estable cuando ya exista uno.
- Si está desplegando OpenClaw a gran escala, pruebe los indicadores experimentales en un entorno más pequeño antes de incorporarlos a una línea base compartida.

## Indicadores actualmente documentados

| Superficie                                | Clave                                                     | Cuándo usarla                                                                                                                          | Más información                                                                                          |
| ----------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Runtime de modelo local                   | `agents.defaults.experimental.localModelLean`             | Un backend local más pequeño o estricto tiene dificultades con la superficie de herramientas predeterminada completa de OpenClaw       | [Modelos locales](/en/gateway/local-models)                                                              |
| Búsqueda en memoria                       | `agents.defaults.memorySearch.experimental.sessionMemory` | Desea que `memory_search` indexe las transcripciones de sesiones anteriores y acepta el costo adicional de almacenamiento/indexado     | [Referencia de configuración de memoria](/en/reference/memory-config#session-memory-search-experimental) |
| Herramienta de planificación estructurada | `tools.experimental.planTool`                             | Desea exponer la herramienta estructurada `update_plan` para el seguimiento de trabajo en múltiples pasos en runtimes e IU compatibles | [Referencia de configuración del gateway](/en/gateway/configuration-reference#toolsexperimental)         |

## Modo lean para modelo local

`agents.defaults.experimental.localModelLean: true` es una válvula de alivio para configuraciones de modelos locales más débiles. Recorta herramientas pesadas predeterminadas como `browser`, `cron` y `message` para que la forma del prompt sea más pequeña y menos frágil para backends compatibles con OpenAI de contexto reducido o más estrictos.

Esto intencionalmente **no** es el camino normal. Si su backend maneja el runtime completo sin problemas, deje esto desactivado.

## Experimental no significa oculto

Si una función es experimental, OpenClaw debería indicarlo claramente en la documentación y en la propia ruta de configuración. Lo que **no** debería hacer es introducir subrepticiamente un comportamiento de vista previa en un control predeterminado de apariencia estable y pretender que eso es normal. Así es como las superficies de configuración se vuelven desordenadas.
