---
title: "Características experimentales"
summary: "Qué significan las marcas experimentales en OpenClaw y cuáles están documentadas actualmente"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

# Características experimentales

Las características experimentales en OpenClaw son **superficies de vista previa opcionales**. Están
behind marcadores explícitos porque aún necesitan kilometraje en el mundo real antes de que
merezcan un valor predeterminado estable o un contrato público duradero.

Trátalas de manera diferente a la configuración normal:

- Manténlas **desactivadas por defecto** a menos que la documentación relacionada te indique probar una.
- Espera que la **forma y el comportamiento cambien** más rápido que la configuración estable.
- Prefiere primero la ruta estable cuando ya exista una.
- Si estás implementando OpenClaw ampliamente, prueba las marcas experimentales en un entorno
  más pequeño antes de incorporarlas a una línea base compartida.

## Marcas documentadas actualmente

| Superficie                                | Clave                                                     | Úsalo cuando                                                                                                                                                                    | Más                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tiempo de ejecución del modelo local      | `agents.defaults.experimental.localModelLean`             | Un backend local más pequeño o más estricto se ahoga con la superficie de herramientas predeterminada completa de OpenClaw                                                      | [Modelos locales](/en/gateway/local-models)                                                              |
| Búsqueda de memoria                       | `agents.defaults.memorySearch.experimental.sessionMemory` | Quieres que `memory_search` indexe las transcripciones de sesiones anteriores y aceptes el costo adicional de almacenamiento/indexación                                         | [Referencia de configuración de memoria](/en/reference/memory-config#session-memory-search-experimental) |
| Herramienta de planificación estructurada | `tools.experimental.planTool`                             | Quieres que la herramienta estructurada `update_plan` esté expuesta para el seguimiento del trabajo de varios pasos en tiempos de ejecución e interfaces de usuario compatibles | [Referencia de configuración de Gateway](/en/gateway/configuration-reference#toolsexperimental)          |

## Modo ligero de modelo local

`agents.defaults.experimental.localModelLean: true` es una válvula de alivio de presión
para configuraciones de modelos locales más débiles. Recorta herramientas predeterminadas pesadas como
`browser`, `cron` y `message` para que la forma del mensaje sea más pequeña y menos frágil
para backends compatibles con OpenAI de contexto pequeño o más estrictos.

Eso intencionalmente **no** es la ruta normal. Si tu backend maneja el tiempo de ejecución completo
de manera limpia, déjalo desactivado.

## Experimental no significa oculto

Si una característica es experimental, OpenClaw debería indicarlo claramente en la documentación y en la ruta de configuración. Lo que **no** debe hacer es introducir un comportamiento de vista previa en un control predeterminado que parezca estable y fingir que es normal. Así es como las superficies de configuración se vuelven desordenadas.
