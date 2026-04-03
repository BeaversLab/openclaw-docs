---
summary: "Cómo OpenClaw resume conversaciones largas para mantenerse dentro de los límites del modelo"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compactación"
---

# Compactación

Cada modelo tiene una ventana de contexto: el número máximo de tokens que puede procesar.
Cuando una conversación se acerca a ese límite, OpenClaw **compacta** los mensajes anteriores
en un resumen para que el chat pueda continuar.

## Cómo funciona

1. Los turnos de conversación anteriores se resumen en una entrada compacta.
2. El resumen se guarda en la transcripción de la sesión.
3. Los mensajes recientes se mantienen intactos.

El historial completo de la conversación se mantiene en el disco. La compactación solo cambia lo que el
modelo ve en el siguiente turno.

## Auto-compactación

La auto-compactación está activada por defecto. Se ejecuta cuando la sesión se acerca al límite de contexto
o cuando el modelo devuelve un error de desbordamiento de contexto (en cuyo caso
OpenClaw compacta y reintentará).

<Info>Antes de compactar, OpenClaw recuerda automáticamente al agente que guarde las notas importantes en los archivos de [memoria](/en/concepts/memory). Esto evita la pérdida de contexto.</Info>

## Compactación manual

Escriba `/compact` en cualquier chat para forzar una compactación. Añada instrucciones para guiar
el resumen:

```
/compact Focus on the API design decisions
```

## Usar un modelo diferente

Por defecto, la compactación utiliza el modelo principal de su agente. Puede utilizar un modelo
más capaz para obtener mejores resúmenes:

```json5
{
  agents: {
    defaults: {
      compaction: {
        model: "openrouter/anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

## Compactación frente a poda

|                | Compactación                          | Poda                                        |
| -------------- | ------------------------------------- | ------------------------------------------- |
| **Qué hace**   | Resume la conversación anterior       | Recorta resultados de herramientas antiguos |
| **¿Guardado?** | Sí (en la transcripción de la sesión) | No (solo en memoria, por solicitud)         |
| **Alcance**    | Toda la conversación                  | Solo resultados de herramientas             |

[La poda de sesiones](/en/concepts/session-pruning) es un complemento más ligero que
recorta la salida de las herramientas sin resumir.

## Solución de problemas

**¿Compacta con demasiada frecuencia?** La ventana de contexto del modelo puede ser pequeña o las
salidas de las herramientas pueden ser grandes. Intente habilitar
[la poda de sesiones](/en/concepts/session-pruning).

**¿El contexto parece obsoleto después de la compactación?** Use `/compact Focus on <topic>` para
guiar el resumen o habilite el [flush de memoria](/en/concepts/memory) para que las notas
sobrevivan.

**¿Necesita una pizarra limpia?** `/new` inicia una sesión nueva sin compactar.

Para configuración avanzada (reservar tokens, preservación de identificadores, motores de contexto personalizados, compactación del lado del servidor de OpenAI), consulte la
[Inmersión profunda en la gestión de sesiones](/en/reference/session-management-compaction).

## Relacionado

- [Sesión](/en/concepts/session) — gestión y ciclo de vida de la sesión
- [Poda de sesiones](/en/concepts/session-pruning) — recorte de resultados de herramientas
- [Contexto](/en/concepts/context) — cómo se construye el contexto para los turnos del agente
- [Ganchos (Hooks)](/en/automation/hooks) — ganchos del ciclo de vida de compactación (before_compaction, after_compaction)
